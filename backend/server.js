/* Local dev / `npm start` entry point: run the shared Express app with a
   long-lived listener. On Vercel the app is exported via api/[...path].js
   instead, so there is no listener there. */
const app = require("./app");

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SalesDesk backend listening on http://localhost:${PORT}`);
});
