import { describe, expect, it } from "vitest";
import { normaliseTime, parseRunSheet, slugify, toSeedRows, toTimeInput } from "./runSheet";
import { applyLive, type LiveState } from "./liveStore";
import type { ScheduleItem } from "../types";

const DAY = "2026-09-26";
const opts = {
  day: DAY,
  locationIds: ["main-stage", "guest-entry"],
  defaultLocationId: "main-stage",
  knownTags: ["procession", "music", "culture", "community"]
};

describe("normaliseTime", () => {
  it("reads the shapes a committee run sheet actually uses", () => {
    expect(normaliseTime("10:00")).toBe("10:00");
    expect(normaliseTime("9:05")).toBe("09:05");
    expect(normaliseTime("09.30")).toBe("09:30");
    expect(normaliseTime("930")).toBe("09:30");
    expect(normaliseTime("1:15pm")).toBe("13:15");
    expect(normaliseTime("12:30 am")).toBe("00:30");
    expect(normaliseTime("3 pm")).toBe("15:00");
  });

  it("rejects things that are not times", () => {
    expect(normaliseTime("Gates open")).toBeNull();
    expect(normaliseTime("25:00")).toBeNull();
    expect(normaliseTime("10:75")).toBeNull();
  });
});

describe("parseRunSheet", () => {
  it("reads pipes, tabs and space-separated columns", () => {
    const { rows, skipped } = parseRunSheet(
      [
        "10:00 - 10:20 | Gates open | guest-entry | community",
        "10:20\t10:45\tDhimey Baja welcome\tguest-entry\tprocession, music",
        "10:45   11:05   Lamp lighting   main-stage"
      ].join("\n"),
      opts
    );
    expect(skipped).toHaveLength(0);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: "gates-open",
      title: "Gates open",
      locationId: "guest-entry",
      categoryIds: ["community"]
    });
    expect(toTimeInput(rows[1].scheduledStart)).toBe("10:20");
    expect(toTimeInput(rows[1].scheduledEnd)).toBe("10:45");
    expect(rows[1].categoryIds).toEqual(["procession", "music"]);
    expect(rows[2].locationId).toBe("main-stage");
  });

  it("runs an item up to the next one when no end time is given", () => {
    const { rows } = parseRunSheet("10:00 | Gates open\n10:20 | Drums", opts);
    expect(toTimeInput(rows[0].scheduledEnd)).toBe("10:20");
    expect(rows[1].scheduledEnd).toBeUndefined();
  });

  it("does not stretch an item across a long gap in the sheet", () => {
    const { rows } = parseRunSheet("10:30 | Dhimey welcome\n1:15pm | Lakhey dance", opts);
    expect(rows[0].scheduledEnd).toBeUndefined();
  });

  it("falls back to the default location and drops unknown tags", () => {
    const { rows } = parseRunSheet("11:00 | Mystery item | nowhere-stage | wobble", opts);
    expect(rows[0].locationId).toBe("main-stage");
    expect(rows[0].categoryIds).toEqual([]);
  });

  it("reports lines it could not read instead of silently dropping them", () => {
    const { rows, skipped } = parseRunSheet("Saturday programme\n10:00 | Gates open\n11:00", opts);
    expect(rows).toHaveLength(1);
    expect(skipped).toHaveLength(2);
    expect(skipped[0].why).toMatch(/start time/);
    expect(skipped[1].why).toMatch(/title/);
  });

  it("keeps ids unique when two items share a title", () => {
    const { rows } = parseRunSheet("10:00 | Break\n14:00 | Break", opts);
    expect(rows.map((r) => r.id)).toEqual(["break", "break-2"]);
  });
});

describe("slugify", () => {
  it("makes safe ids", () => {
    expect(slugify("Kumari Rath Yatra!")).toBe("kumari-rath-yatra");
    expect(slugify("  ")).toBe("item");
  });
});

/* ------------------------------------------------------------------ */

const item = (over: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: "lakhey",
  slug: "lakhey",
  title: { en: "Lakhey dance" },
  summary: { en: "Masked dance." },
  scheduledStart: `${DAY}T12:30:00+10:00`,
  scheduledEnd: `${DAY}T12:55:00+10:00`,
  status: "scheduled",
  locationId: "main-stage",
  categoryIds: ["culture"],
  published: true,
  updatedAt: `${DAY}T08:00:00+10:00`,
  ...over
});

const state = (over: Partial<LiveState> = {}): LiveState => ({
  schedule: {}, announcements: {}, added: [], media: {}, updatedAt: 0, ...over
});

describe("applyLive with organiser edits", () => {
  it("applies a retitle and a retime", () => {
    const [result] = applyLive([item()], state({
      schedule: {
        lakhey: { title: "Lakhey dance (short version)", scheduledStart: `${DAY}T13:00:00+10:00` }
      }
    }));
    expect(result.title.en).toBe("Lakhey dance (short version)");
    expect(toTimeInput(result.scheduledStart)).toBe("13:00");
  });

  it("drops a removed item and keeps the rest", () => {
    const result = applyLive([item(), item({ id: "pulukisi", slug: "pulukisi" })], state({
      schedule: { lakhey: { removed: true } }
    }));
    expect(result.map((i) => i.id)).toEqual(["pulukisi"]);
  });

  it("merges added items into the programme in time order", () => {
    const result = applyLive([item()], state({
      added: [{
        id: "added-1",
        title: "Extra drum set",
        scheduledStart: `${DAY}T11:00:00+10:00`,
        locationId: "main-stage",
        categoryIds: ["music"]
      }]
    }));
    expect(result.map((i) => i.id)).toEqual(["added-1", "lakhey"]);
    expect(result[0].published).toBe(true);
  });

  it("swaps a photo on a programme item", () => {
    const [result] = applyLive([item()], state({ media: { "sched:lakhey": "/images/new.jpg" } }));
    expect(result.image?.src).toBe("/images/new.jpg");
  });

  it("leaves an untouched item alone", () => {
    const original = item();
    const [result] = applyLive([original], state());
    expect(result).toBe(original);
  });
});

describe("toSeedRows", () => {
  it("renders a block that matches the shape of data.ts", () => {
    const out = toSeedRows([item({ highlight: true })]);
    expect(out).toContain("const scheduleRows: SchedRow[] = [");
    expect(out).toContain('["lakhey", "Lakhey dance", "12:30", "12:55", "main-stage",');
    expect(out).toContain('["culture"], true],');
  });

  it("escapes quotes so the block still compiles", () => {
    const out = toSeedRows([item({ title: { en: 'The "big" one' } })]);
    expect(out).toContain('\\"big\\"');
  });
});
