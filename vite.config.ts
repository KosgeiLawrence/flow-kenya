import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use relative asset paths when packaging for Capacitor (Android/iOS WebView
  // loads index.html from a non-root origin). Falls back to root-relative for
  // normal web deploys so BrowserRouter and OG tags keep working.
  const isCapacitor = process.env.CAPACITOR === "true";
  return ({
  base: isCapacitor ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
    build: {
      target: "es2020",
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    !isCapacitor && VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      manifest: {
        name: "Duara Flow — Circular Economy Platform",
        short_name: "Duara Flow",
        description: "Kenya's end-to-end digital traceability and compliance infrastructure for the circular economy.",
        theme_color: "#2b5e3f",
        background_color: "#f7f3ee",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  optimizeDeps: {
    include: ["react", "react-dom", "react-i18next", "i18next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  });
});
