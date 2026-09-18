import type { EventConfig, ScheduleItem } from "../types";

const stamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function download(filename: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function vevent(item: ScheduleItem, location?: string) {
  const start = item.effectiveStart || item.scheduledStart;
  const end = item.effectiveEnd || item.scheduledEnd || start;
  return [
    "BEGIN:VEVENT",
    `UID:${item.id}@indrajatra.newaguthi.org.au`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(item.title.en)}`,
    `DESCRIPTION:${escape(item.summary.en)}`,
    location ? `LOCATION:${escape(location)}` : "",
    "END:VEVENT"
  ].filter(Boolean);
}

const wrap = (lines: string[]) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Newa Guthi Victoria//Indra Jatra Melbourne 2026//EN",
    ...lines,
    "END:VCALENDAR"
  ].join("\r\n");

export function downloadIcs(item: ScheduleItem, location?: string) {
  download(`${item.slug}.ics`, wrap(vevent(item, location)));
}

export function downloadItinerary(items: ScheduleItem[], event: EventConfig) {
  const venue = `${event.venueName}, ${event.venueAddress}`;
  download("indra-jatra-melbourne-2026.ics", wrap(items.flatMap((item) => vevent(item, venue))));
}
