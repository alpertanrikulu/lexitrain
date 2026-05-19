import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppPage } from "./pages/AppPage";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AppPage />
    </ErrorBoundary>
  </StrictMode>,
);
