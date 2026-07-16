import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Guard: unregister service workers in iframe/preview contexts, and inside
// Capacitor native WebViews where a SW would break asset loading.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

const isNative =
  window.location.protocol === "capacitor:" ||
  window.location.protocol === "file:" ||
  // @ts-expect-error – Capacitor injects this global at runtime
  typeof window.Capacitor !== "undefined";

if (isPreviewHost || isInIframe || isNative) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Global unhandled rejection logger — surfaces silent async errors in
// production and Android WebView logcat without crashing the app.
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
