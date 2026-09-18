import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    target: "es2020",
    cssTarget: "safari15",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          icons: ["lucide-react"]
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "offline.html",
        "icons/apple-touch-icon.png",
        "images/festival-hero.jpg",
        "map/indra-jatra-2026-planned-site-map.jpeg"
      ],
      manifest: {
        id: "/",
        name: "Indra Jatra — Yenya Punhi Melbourne 2026",
        short_name: "Indra Jatra",
        description:
          "Your companion for Indra Jatra — Yenya Punhi Melbourne 2026. Live programme, site map, the Yenya cultural trail and everything you need on the day.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        lang: "en-AU",
        categories: ["events", "travel", "education"],
        background_color: "#2C0C12",
        theme_color: "#6E1F2B",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          { name: "What's on now", url: "/schedule" },
          { name: "Site map", url: "/map" },
          { name: "Cultural trail", url: "/explore" }
        ]
      },
      workbox: {
        // Single-page app: unknown routes must resolve to the app shell, NOT
        // to offline.html — otherwise every deep link and hard refresh in an
        // installed PWA shows the offline page instead of the festival guide.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            // Photos and logos are updated during event preparation. Prefer the
            // latest upload while retaining the cached copy for offline use.
            handler: "NetworkFirst",
            options: {
              cacheName: "ij26-images-v2",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "ij26-font-css" }
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "ij26-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Live festival data, once the PHP API is wired up: always try the
            // network first so the programme is current, fall back to cache.
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "ij26-api",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 6 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ]
});
