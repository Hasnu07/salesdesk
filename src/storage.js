/* =========================================================================
   window.storage shim
   The SalesDesk app was built for Claude's artifact runtime, which provides a
   global `window.storage` shared key-value store. This shim re-implements that
   same contract against our Express backend (proxied at /api in dev):

     window.storage.get(key, shared?)    -> { value } | null
     window.storage.set(key, value, shared?) -> true
     window.storage.delete(key, shared?) -> true

   The `shared` argument is accepted for API compatibility but ignored — the
   backend treats every key as shared (single source of truth for all users).
   Must be imported before the App component so it exists on first render.
   ========================================================================= */
const BASE = "/api/kv";
const url = (key) => `${BASE}/${encodeURIComponent(key)}`;

window.storage = {
  async get(key /*, shared */) {
    const r = await fetch(url(key));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`storage.get(${key}) failed: ${r.status}`);
    return r.json(); // { value }
  },
  async set(key, value /*, shared */) {
    const r = await fetch(url(key), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: String(value) }),
    });
    if (!r.ok) throw new Error(`storage.set(${key}) failed: ${r.status}`);
    return true;
  },
  async delete(key /*, shared */) {
    const r = await fetch(url(key), { method: "DELETE" });
    if (!r.ok) throw new Error(`storage.delete(${key}) failed: ${r.status}`);
    return true;
  },
};
