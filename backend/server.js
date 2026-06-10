/* =========================================================================
   SalesDesk backend — shared key-value store
   Implements the `window.storage` API the frontend depends on:
     GET    /api/kv/:key   -> { value } | 404
     PUT    /api/kv/:key   { value }    -> { ok: true }
     DELETE /api/kv/:key                -> { ok: true }

   Every key is shared (one source of truth for all users/devices), so data
   entered on one device is consistent on every other device — they all talk
   to this one backend.

   Storage backend is chosen at boot:
     - DATABASE_URL set  -> PostgreSQL (durable, server-based; used in prod)
     - otherwise         -> local files under ./data (convenient for dev)
   Values are opaque strings (JSON blobs or base64 image data URLs).
   ========================================================================= */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());
// Image proofs are base64 data URLs (UI-capped ~3.5 MB) wrapped in JSON.
app.use(express.json({ limit: "25mb" }));

let store; // assigned during boot, before app.listen()

/* ----------------------- Postgres backend (durable) ---------------------- */
async function makePgStore(url) {
  const { Pool } = require("pg");
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  const pool = new Pool({
    connectionString: url,
    // Hosted Postgres (Render, Neon, etc.) requires TLS; local usually doesn't.
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  return {
    kind: "postgres",
    async get(key) {
      const r = await pool.query("SELECT value FROM kv WHERE key = $1", [key]);
      return r.rows.length ? r.rows[0].value : null;
    },
    async set(key, value) {
      await pool.query(
        `INSERT INTO kv (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value]
      );
    },
    async del(key) {
      await pool.query("DELETE FROM kv WHERE key = $1", [key]);
    },
  };
}

/* --------------------- File backend (local dev only) ---------------------- */
function makeFileStore() {
  const DATA_DIR = path.join(__dirname, "data");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Reversible, collision-free, filesystem-safe filename for any key.
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
      fs.renameSync(tmp, f); // atomic replace
    },
    async del(key) {
      const f = fileFor(key);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    },
  };
}

/* -------------------------------- routes --------------------------------- */
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, store: store ? store.kind : "starting" })
);

app.get("/api/kv/:key", async (req, res) => {
  try {
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
    await store.set(req.params.key, value);
    res.json({ ok: true });
  } catch (e) {
    console.error("kv set failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/kv/:key", async (req, res) => {
  try {
    await store.del(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    console.error("kv delete failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

/* ----------------- serve built frontend in production -------------------- */
// One origin, one port: relative /api calls from the shim are same-origin.
const DIST_DIR = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
  console.log(`Serving built frontend from ${DIST_DIR}`);
}

/* --------------------------------- boot ---------------------------------- */
(async () => {
  try {
    if (DATABASE_URL) {
      store = await makePgStore(DATABASE_URL);
      console.log("Storage: PostgreSQL (durable, server-based)");
    } else {
      store = makeFileStore();
      console.log("Storage: local files (./data) — set DATABASE_URL for a server DB");
    }
  } catch (e) {
    console.error("Postgres init failed; falling back to local files:", e);
    store = makeFileStore();
  }
  app.listen(PORT, () => {
    console.log(`SalesDesk backend listening on http://localhost:${PORT}`);
  });
})();
