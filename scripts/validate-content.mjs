/* ------------------------------------------------------------------
   validate:content — the gate that stops half-finished content
   reaching a visitor's phone on the day.

   Run it before every deploy:  npm run validate:content
   ------------------------------------------------------------------ */

import { seedData } from "../frontend/src/content/seed/data.ts";

const errors = [];
const warnings = [];

const locationIds = new Set(seedData.locations.map((l) => l.id));
const scheduleIds = new Set(seedData.schedule.map((s) => s.id));
const trailIds = new Set(seedData.trailPoints.map((p) => p.id));

/* ---- referential integrity ---- */

for (const item of seedData.schedule) {
  if (!locationIds.has(item.locationId)) {
    errors.push(`Schedule "${item.id}" points at unknown location "${item.locationId}"`);
  }
  if (new Date(item.scheduledEnd ?? item.scheduledStart) < new Date(item.scheduledStart)) {
    errors.push(`Schedule "${item.id}" ends before it starts`);
  }
  for (const ref of item.relatedTrailPointIds ?? []) {
    if (!trailIds.has(ref)) errors.push(`Schedule "${item.id}" links to unknown trail stop "${ref}"`);
  }
}

for (const point of seedData.trailPoints) {
  if (!locationIds.has(point.locationId)) {
    errors.push(`Trail stop "${point.slug}" points at unknown location "${point.locationId}"`);
  }
  for (const ref of point.relatedScheduleItemIds ?? []) {
    if (!scheduleIds.has(ref)) errors.push(`Trail stop "${point.slug}" links to unknown item "${ref}"`);
  }
  for (const ref of point.relatedTrailPointIds ?? []) {
    if (!seedData.trailPoints.some((p) => p.slug === ref)) {
      errors.push(`Trail stop "${point.slug}" links to unknown stop "${ref}"`);
    }
  }
  if (point.reviewStatus !== "approved") {
    warnings.push(`Trail stop "${point.slug}" is "${point.reviewStatus}" — needs cultural committee sign-off`);
  }
}

for (const listing of seedData.listings) {
  if (listing.locationId && !locationIds.has(listing.locationId)) {
    errors.push(`Listing "${listing.id}" points at unknown location "${listing.locationId}"`);
  }
}

for (const card of seedData.infoCards) {
  if (card.locationId && !locationIds.has(card.locationId)) {
    errors.push(`Info card "${card.id}" points at unknown location "${card.locationId}"`);
  }
}

/* ---- uniqueness ---- */

const qrCodes = seedData.trailPoints.flatMap((p) => p.qrCodes);
const duplicateQr = qrCodes.filter((c, i) => qrCodes.indexOf(c) !== i);
if (duplicateQr.length) errors.push(`Duplicate QR codes: ${[...new Set(duplicateQr)].join(", ")}`);

for (const [label, list] of [
  ["location", seedData.locations],
  ["schedule item", seedData.schedule],
  ["trail stop", seedData.trailPoints],
  ["listing", seedData.listings]
]) {
  const ids = list.map((i) => i.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`Duplicate ${label} ids: ${[...new Set(dupes)].join(", ")}`);
}

/* ---- map markers ---- */

for (const l of seedData.locations) {
  if (l.mapX < 0 || l.mapX > 100 || l.mapY < 0 || l.mapY > 100) {
    errors.push(`Location "${l.id}" sits outside the map image (${l.mapX}, ${l.mapY})`);
  }
}

/* ---- no placeholder copy reaches a visitor ---- */

const blob = JSON.stringify(seedData).toLowerCase();
for (const needle of [
  "lorem", "seed/demo", "example.com", "placeholder", "draft listing",
  "to be confirmed.", "tbc", "todo", "xxx", "replaceable"
]) {
  if (blob.includes(needle)) errors.push(`Placeholder text "${needle}" is still in the published content`);
}

/* ---- essential event details ---- */

const e = seedData.event;
for (const [field, value] of Object.entries({
  venueName: e.venueName, venueAddress: e.venueAddress,
  contactEmail: e.contactEmail, contactPhone: e.contactPhone,
  heroImage: e.heroMedia?.src
})) {
  if (!value) errors.push(`Event is missing ${field}`);
}
if (!seedData.infoCards.some((c) => c.id === "emergency")) {
  errors.push("No emergency info card — this must never be removed");
}

/* ---- report ---- */

if (warnings.length) {
  console.warn("\nWarnings:");
  warnings.forEach((w) => console.warn(`  · ${w}`));
}

if (errors.length) {
  console.error("\nContent validation FAILED:");
  errors.forEach((err) => console.error(`  ✗ ${err}`));
  process.exit(1);
}

console.log(
  `\nContent OK — ${seedData.schedule.length} programme items, ` +
  `${seedData.trailPoints.length} trail stops, ${seedData.locations.length} locations, ` +
  `${seedData.listings.length} listings, ${seedData.infoCards.length} info cards, ` +
  `${seedData.faqs.length} FAQs.` +
  (warnings.length ? `\n${warnings.length} warning(s) above — safe to ship, but chase the sign-offs.\n` : "\n")
);
