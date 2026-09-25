/* ------------------------------------------------------------------
   runSheet - turn a pasted run sheet into programme items, and turn
   the current programme back into a block the developer can paste
   into content/seed/data.ts to publish it permanently.

   The parser is deliberately forgiving. Committee run sheets arrive
   as Word tables, Excel columns or plain text, so cells may be split
   by tabs, pipes or runs of spaces, and times may be written 9:30,
   09.30, 9:30am or 10:00-10:20.
   ------------------------------------------------------------------ */

import type { ScheduleItem } from "../types";
import type { DraftItem } from "./liveStore";

/** Melbourne is AEST (+10:00) in late September - daylight saving starts in October. */
const OFFSET = "+10:00";
const TZ = "Australia/Melbourne";

const TIME = /^(\d{1,2})\s*[:.]?\s*(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/i;
const RANGE = /^(.+?)\s*(?:-|–|\u2014|to)\s*(.+)$/i;

/** "10:05" (Melbourne, on the festival day) -> ISO string. */
export function toIso(day: string, hhmm: string): string {
  return `${day}T${hhmm}:00${OFFSET}`;
}

/** ISO string -> "10:05", for a <input type="time">. */
export function toTimeInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Accepts 9:30, 09.30, 930, 9am, 2:15 pm. Returns "HH:MM" or null. */
export function normaliseTime(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  const compact = /^(\d{3,4})(am|pm)?$/.exec(text);
  let hour: number;
  let minute: number;
  let meridiem: string | undefined;

  if (compact) {
    const digits = compact[1];
    hour = Number(digits.slice(0, digits.length - 2));
    minute = Number(digits.slice(-2));
    meridiem = compact[2];
  } else {
    const match = TIME.exec(text);
    if (!match) return null;
    hour = Number(match[1]);
    minute = Number(match[2] ?? "0");
    meridiem = match[3]?.replace(/\./g, "");
  }

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute > 59) return null;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "item";
}

function splitCells(line: string): string[] {
  const raw = /\t|\|/.test(line) ? line.split(/\t|\|/) : line.split(/\s{2,}/);
  return raw.map((cell) => cell.trim()).filter((cell) => cell.length > 0);
}

export type ParseResult = {
  rows: DraftItem[];
  skipped: { line: string; why: string }[];
};

export type ParseOptions = {
  day: string;
  locationIds: string[];
  defaultLocationId: string;
  knownTags?: string[];
};

/**
 * Parse pasted text into programme items. One item per line:
 *
 *   10:00 - 10:20 | Gates open | guest-entry | community
 *   10:20  10:45  Dhimey Baja welcome  guest-entry  procession, music
 *   1:15pm  Lakhey dance
 */
export function parseRunSheet(text: string, options: ParseOptions): ParseResult {
  const { day, locationIds, defaultLocationId, knownTags } = options;
  const rows: DraftItem[] = [];
  const skipped: { line: string; why: string }[] = [];
  const used = new Set<string>();

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let cells = splitCells(trimmed);
    if (!cells.length) return;

    // A leading "10:00 - 10:20" range counts as two cells.
    const range = RANGE.exec(cells[0]);
    if (range && normaliseTime(range[1]) && normaliseTime(range[2])) {
      cells = [range[1], range[2], ...cells.slice(1)];
    }

    const start = normaliseTime(cells[0]);
    if (!start) {
      skipped.push({ line: trimmed, why: "no start time at the beginning of the line" });
      return;
    }
    cells = cells.slice(1);

    let end: string | null = null;
    if (cells.length > 1) {
      const maybe = normaliseTime(cells[0]);
      if (maybe) {
        end = maybe;
        cells = cells.slice(1);
      }
    }

    // A "10:00 - 10:20" written as its own cell after the start.
    if (!end && cells.length > 1) {
      const innerRange = RANGE.exec(cells[0]);
      if (innerRange && normaliseTime(innerRange[2])) {
        end = normaliseTime(innerRange[2]);
        cells = cells.slice(1);
      }
    }

    const title = (cells.shift() ?? "").trim();
    if (!title) {
      skipped.push({ line: trimmed, why: "no title after the time" });
      return;
    }

    let locationId = defaultLocationId;
    if (cells.length) {
      const candidate = slugify(cells[0]);
      if (locationIds.includes(cells[0].trim())) {
        locationId = cells.shift()!.trim();
      } else if (locationIds.includes(candidate)) {
        cells.shift();
        locationId = candidate;
      }
    }

    let categoryIds: string[] = [];
    if (cells.length) {
      const tags = cells
        .join(",")
        .split(/[,;/]/)
        .map((tag) => slugify(tag))
        .filter(Boolean);
      categoryIds = knownTags ? tags.filter((tag) => knownTags.includes(tag)) : tags;
    }

    let id = slugify(title);
    let n = 2;
    while (used.has(id)) id = `${slugify(title)}-${n++}`;
    used.add(id);

    rows.push({
      id,
      title,
      scheduledStart: toIso(day, start),
      scheduledEnd: end ? toIso(day, end) : undefined,
      locationId,
      categoryIds
    });
  });

  // No end time? Run the item up to the start of the next one - but only
  // if that is close behind. A three-hour gap means the run sheet simply
  // did not say, and a 45-minute default reads better than a wrong block.
  const MAX_FILL_MINUTES = 90;
  rows.forEach((row, index) => {
    if (row.scheduledEnd) return;
    const next = rows[index + 1];
    if (!next) return;
    const gap = (new Date(next.scheduledStart).getTime() - new Date(row.scheduledStart).getTime()) / 60_000;
    if (gap > 0 && gap <= MAX_FILL_MINUTES) row.scheduledEnd = next.scheduledStart;
  });

  return { rows, skipped };
}

const quote = (text: string) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;

/**
 * Render the live programme as the `scheduleRows` literal in
 * content/seed/data.ts, so today's edits can be published for good.
 */
export function toSeedRows(items: ScheduleItem[]): string {
  const lines = items.map((item) => {
    const start = toTimeInput(item.scheduledStart);
    const end = toTimeInput(item.scheduledEnd) || start;
    const tags = `[${item.categoryIds.map(quote).join(", ")}]`;
    const head = `  [${quote(item.slug || item.id)}, ${quote(item.title.en)}, ${quote(start)}, ${quote(end)}, ${quote(item.locationId)},`;
    const summary = `    ${quote(item.summary?.en ?? "")},`;
    const tail = `    ${tags}${item.highlight ? ", true" : ""}],`;
    return [head, summary, tail].join("\n");
  });
  return ["const scheduleRows: SchedRow[] = [", ...lines, "];"].join("\n");
}
