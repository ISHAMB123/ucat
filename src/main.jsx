import React from "react";
import { createRoot } from "react-dom/client";
/* Self-hosted Inter (bundled by Vite, no external font requests, so no
   Google Fonts IP leak, in keeping with the app's no-tracking stance). */
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import ErrorBoundary from "../ErrorBoundary.jsx";
import UcatDrillTrainer from "../ucat-drill-trainer.jsx";

/* App entry. The error boundary wraps the whole app so one component
   throwing shows a recovery screen rather than a blank page. */
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UcatDrillTrainer />
    </ErrorBoundary>
  </React.StrictMode>
);
