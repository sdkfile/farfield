import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { initializeThemeFromStorage } from "./lib/theme-presets";
import "./index.css";

initializeThemeFromStorage();

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
