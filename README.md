# SalesDesk — Commission Portal

Seller commission portal for a watch-dealing business. Originally a single-file
Claude artifact; now a runnable full-stack app.

- **Frontend** — Vite + React (`frontend/`). The original app, unchanged, in
  `frontend/src/SalesDesk.jsx`.
- **Backend** — Express shared key-value store (`backend/`) that re-implements
  the `window.storage` API the app expects. Data persists under `backend/data/`.

## Prerequisites

- Node.js 18+ (built/tested on Node 24)

## First-time setup

```bash
npm run install:all
```

This installs dependencies at the root, in `backend/`, and in `frontend/`.

## Run (development)

```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173  ← open this

The frontend proxies `/api/*` to the backend, so everything is same-origin in
the browser. On first launch the app seeds demo data automatically.

## Production-style run

```bash
npm run build   # builds the frontend
npm start       # serves the built frontend + runs the backend
```

## Login PINs (demo seed)

- **Admin** — `1234`
- **Accounting** — `9999`
- **Sellers** — Josh `1111`, Ummay `2222`, Kashan `3333`, Alina `4444`

## Data & reset

All state lives in `backend/data/` as one file per storage key
(`sales_desk_v7`, plus `sd_file_*` for uploaded payment proofs). Delete that
folder to wipe everything; the app re-seeds on next load. The in-app
**Settings → Reset** also restores the demo seed.

## Architecture notes

The app's only non-standard dependency was `window.storage` (a shared
key-value store from the artifact runtime). `frontend/src/storage.js` shims
that global to call the backend:

| window.storage call            | HTTP                       |
| ------------------------------ | -------------------------- |
| `get(key, shared)`             | `GET /api/kv/:key`         |
| `set(key, value, shared)`      | `PUT /api/kv/:key`         |
| `delete(key, shared)`          | `DELETE /api/kv/:key`      |

The `shared` flag is ignored — every key is shared (one source of truth for
all users), which matches how the app was written (`shared=true` everywhere).
