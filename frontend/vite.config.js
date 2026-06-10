import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api to the Express backend so the frontend's window.storage shim
// is same-origin in dev (no CORS, no hard-coded host).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
