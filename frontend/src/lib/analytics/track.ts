/* ------------------------------------------------------------------
   track — a deliberately small, allow-listed analytics surface.

   No personal data, no free-text, no third-party script. Only the
   event names below are ever recorded, and only counts and ids that
   already exist in the published content.
   ------------------------------------------------------------------ */

const ALLOWED = new Set([
  "page_view", "qr_scan", "trail_point_view", "trail_point_discovered", "passport_completed",
  "schedule_view", "schedule_item_saved", "calendar_downloaded", "map_view", "map_marker_selected",
  "map_stall_selected", "map_truck_selected",
  "directions_opened", "announcement_viewed", "eventbrite_clicked", "membership_clicked",
  "newsletter_submitted", "class_clicked", "stall_viewed", "language_changed",
  "pwa_install_prompted", "pwa_installed", "signin_started", "signin_completed"
]);

const DEVICE_KEY = "ij26.analytics.device";
const SESSION_KEY = "ij26.analytics.session";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (Number(character) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(character) / 4).toString(16)
  );
}

function storedId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = uuid();
  storage.setItem(key, value);
  return value;
}

function deviceType() {
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

function displayMode() {
  return window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser";
}

export function trackEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (!ALLOWED.has(name)) return;
  if (import.meta.env.DEV) console.info("[analytics]", name, properties);
  if (import.meta.env.DEV || typeof window === "undefined") return;

  try {
    const payload = JSON.stringify({
      deviceId: storedId(window.localStorage, DEVICE_KEY),
      sessionId: storedId(window.sessionStorage, SESSION_KEY),
      event: name,
      path: window.location.pathname,
      deviceType: deviceType(),
      displayMode: displayMode(),
      properties
    });
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // Storage can be unavailable in private browsing; analytics must never interrupt the app.
  }
}
