// Install the window.storage shim before anything imports the app.
import "./storage.js";

import { createRoot } from "react-dom/client";
import App from "./SalesDesk.jsx";

// No StrictMode: the app's load effect seeds storage on first run, and
// StrictMode's double-invoke in dev would race that seed. The artifact
// runtime renders once, so we match it.
createRoot(document.getElementById("root")).render(<App />);
