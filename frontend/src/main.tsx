import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App";
import "./styles/post-event.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true).catch(() => undefined);
  },
  onRegisteredSW(_url, registration) {
    window.setInterval(() => void registration?.update().catch(() => undefined), 60_000);
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
