/* =========================================================================
   SalesDesk — Express app (no listen here).
   Shared by:
     - backend/server.js  (local dev / `npm start`: calls app.listen)
     - api/[...path].js    (Vercel serverless function: exports this app)

   Implements the `window.storage` contract the frontend depends on:
     GET    /api/kv/:key   -> { value } | 404
     PUT    /api/kv/:key   { value }    -> { ok: true }
     DELETE /api/kv/:key                -> { ok: true }

   Every key is shared (one source of truth), so data entered on any device is
   consistent on every device — they all hit this same API + database.

   Storage backend is chosen from the environment:
     - DATABASE_URL / POSTGRES_URL set -> PostgreSQL (durable, server-based)
     - otherwise                        -> local files under ./data (dev only)
   ========================================================================= */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Accept any of the common env var names (Vercel Postgres sets POSTGRES_URL*).
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const app = express();
app.use(cors());
// Body parsing that works both as a long-lived server and as a Vercel function.
// Vercel's Node runtime pre-parses the JSON body into req.body and drains the
// stream; if so, mark it handled so express.json() doesn't overwrite it with {}.
// Locally there's no pre-parsing, so express.json() reads the stream as usual.
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") req._body = true;
  next();
});
app.use(express.json({ limit: "25mb" }));

/* ----------------------- lazy, memoized store init ----------------------- */
// Serverless can't block on startup, so the store initializes on first use and
// is cached. A failed init is NOT cached, so the next request retries.
let storePromise = null;
function getStore() {
  if (!storePromise) {
    storePromise = initStore().catch((e) => {
      storePromise = null;
      throw e;
    });
  }
  return storePromise;
}
async function initStore() {
  if (DATABASE_URL) {
    const s = await makePgStore(DATABASE_URL);
    console.log("Storage: PostgreSQL (durable, server-based)");
    return s;
  }
  console.log("Storage: local files (./data) — set DATABASE_URL for a server DB");
  return makeFileStore();
}

/* ----------------------- Postgres backend (durable) ---------------------- */
async function makePgStore(url) {
  const { Pool } = require("pg");
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  const pool = new Pool({
    connectionString: url,
    // Hosted Postgres (Vercel/Neon/etc.) requires TLS; local usually doesn't.
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 3,
  });
  // Namespaced table so SalesDesk can safely share a database with other apps.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salesdesk_kv (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  return {
    kind: "postgres",
    async get(key) {
      const r = await pool.query("SELECT value FROM salesdesk_kv WHERE key = $1", [key]);
      return r.rows.length ? r.rows[0].value : null;
    },
    async set(key, value) {
      await pool.query(
        `INSERT INTO salesdesk_kv (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value]
      );
    },
    async del(key) {
      await pool.query("DELETE FROM salesdesk_kv WHERE key = $1", [key]);
    },
  };
}

/* --------------------- File backend (local dev only) ---------------------- */
function makeFileStore() {
  const DATA_DIR = path.join(__dirname, "data");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const fileFor = (key) =>
    path.join(DATA_DIR, Buffer.from(String(key)).toString("base64url") + ".dat");
  return {
    kind: "file",
    async get(key) {
      const f = fileFor(key);
      return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
    },
    async set(key, value) {
      const f = fileFor(key);
      const tmp = `${f}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, value, "utf8");
      fs.renameSync(tmp, f);
    },
    async del(key) {
      const f = fileFor(key);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    },
  };
}

/* -------------------------------- routes --------------------------------- */
app.get("/api/health", async (_req, res) => {
  try {
    const store = await getStore();
    res.json({ ok: true, store: store.kind });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/kv/:key", async (req, res) => {
  try {
    const store = await getStore();
    const value = await store.get(req.params.key);
    if (value == null) return res.status(404).json({ error: "not found" });
    res.json({ value });
  } catch (e) {
    console.error("kv get failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

app.put("/api/kv/:key", async (req, res) => {
  const { value } = req.body || {};
  if (typeof value !== "string") {
    return res.status(400).json({ error: "body.value must be a string" });
  }
  try {
    const store = await getStore();
    await store.set(req.params.key, value);
    res.json({ ok: true });
  } catch (e) {
    console.error("kv set failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/kv/:key", async (req, res) => {
  try {
    const store = await getStore();
    await store.del(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    console.error("kv delete failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

/* --------- serve built frontend locally (Vercel serves it as static) ------ */
const DIST_DIR = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

module.exports = app;
