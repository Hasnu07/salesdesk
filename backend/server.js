/* =========================================================================
   SalesDesk backend — shared key-value store
   Re-implements the `window.storage` API the SalesDesk frontend depends on:
     GET    /api/kv/:key   -> { value } | 404
     PUT    /api/kv/:key   { value }    -> { ok: true }
     DELETE /api/kv/:key                -> { ok: true }
   Every key is "shared" (one source of truth for all users), so the
   frontend's `shared` flag is accepted but ignored.
   Values are opaque strings (JSON blobs or base64 image data URLs) and are
   persisted one-file-per-key under ./data so large image proofs don't bloat
   a single document.
   ========================================================================= */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
// Image proofs are stored as base64 data URLs (capped ~3.5 MB by the UI),
// which inflate ~33% in base64 and are wrapped in JSON — 25mb is comfortable.
app.use(express.json({ limit: "25mb" }));

// Reversible, collision-free, filesystem-safe filename for any key.
const fileFor = (key) =>
  path.join(DATA_DIR, Buffer.from(String(key)).toString("base64url") + ".dat");

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/kv/:key", (req, res) => {
  const f = fileFor(req.params.key);
  if (!fs.existsSync(f)) return res.status(404).json({ error: "not found" });
  try {
    res.json({ value: fs.readFileSync(f, "utf8") });
  } catch (e) {
    console.error("kv get failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

app.put("/api/kv/:key", (req, res) => {
  const { value } = req.body || {};
  if (typeof value !== "string") {
    return res.status(400).json({ error: "body.value must be a string" });
  }
  try {
    const f = fileFor(req.params.key);
    const tmp = `${f}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, value, "utf8");
    fs.renameSync(tmp, f); // atomic replace
    res.json({ ok: true });
  } catch (e) {
    console.error("kv set failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/kv/:key", (req, res) => {
  try {
    const f = fileFor(req.params.key);
    if (fs.existsSync(f)) fs.unlinkSync(f);
    res.json({ ok: true });
  } catch (e) {
    console.error("kv delete failed", req.params.key, e);
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`SalesDesk backend listening on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
