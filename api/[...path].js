// Vercel serverless function: handles every /api/* request by delegating to
// the shared Express app. An Express app is itself a (req, res) handler, so it
// works directly as a Vercel Node function. Static files (the built frontend)
// are served by Vercel from the Vite output (dist) — not here.
module.exports = require("../server/app");
