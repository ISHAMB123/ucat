import React from "react";
import { createRoot } from "react-dom/client";
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
