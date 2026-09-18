/* ------------------------------------------------------------------
   track — a deliberately small, allow-listed analytics surface.

   No personal data, no free-text, no third-party script. Only the
   event names below are ever recorded, and only counts and ids that
   already exist in the published content.
   ------------------------------------------------------------------ */

const ALLOWED = new Set([
  "page_view", "qr_scan", "trail_point_view", "trail_point_discovered", "passport_completed",
  "schedule_view", "schedule_item_saved", "calendar_downloaded", "map_view", "map_marker_selected",
  "directions_opened", "announcement_viewed", "eventbrite_clicked", "membership_clicked",
  "newsletter_submitted", "class_clicked", "stall_viewed", "language_changed",
  "pwa_install_prompted", "pwa_installed", "signin_started", "signin_completed"
]);

export function trackEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (!ALLOWED.has(name)) return;
  if (import.meta.env.DEV) console.info("[analytics]", name, properties);
  // Production: POST to /api/analytics from here. Nothing else changes.
}
