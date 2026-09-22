import { describe, expect, it } from "vitest";
import {
  countdownLabel, countdownParts, eventStatus, getNowNextLater, itemState
} from "./schedule";
import { seedData } from "../../content/seed/data";
import { applyLive, liveStore, type LiveState } from "../live/liveStore";
import type { ScheduleItem } from "../types";

const day = "2026-09-26";
const at = (time: string) => `${day}T${time}:00+10:00`;

const item = (over: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: "x", slug: "x",
  title: { en: "Test" }, summary: { en: "Test" },
  scheduledStart: at("12:00"), scheduledEnd: at("12:30"),
  status: "scheduled", locationId: "main-stage", categoryIds: [],
  published: true, updatedAt: at("08:00"),
  ...over
});

describe("itemState", () => {
  it("is scheduled before the start time", () => {
    expect(itemState(item(), new Date(at("11:00")))).toBe("scheduled");
  });

  it("is live between start and end", () => {
    expect(itemState(item(), new Date(at("12:15")))).toBe("live");
  });

  it("is completed after the end time", () => {
    expect(itemState(item(), new Date(at("13:00")))).toBe("completed");
  });

  it("respects an organiser cancellation whatever the clock says", () => {
    expect(itemState(item({ status: "cancelled" }), new Date(at("12:15")))).toBe("cancelled");
  });

  it("follows effectiveStart when an item has been pushed back", () => {
    const delayed = item({ status: "delayed", effectiveStart: at("12:30"), effectiveEnd: at("13:00") });
    expect(itemState(delayed, new Date(at("12:15")))).toBe("delayed");
    expect(itemState(delayed, new Date(at("12:45")))).toBe("live");
  });
});

describe("getNowNextLater", () => {
  it("separates what is on now from what is coming", () => {
    const schedule = [
      item({ id: "a", scheduledStart: at("10:00"), scheduledEnd: at("10:30") }),
      item({ id: "b", scheduledStart: at("12:00"), scheduledEnd: at("12:30") }),
      item({ id: "c", scheduledStart: at("13:00"), scheduledEnd: at("13:30") })
    ];
    const result = getNowNextLater(schedule, new Date(at("12:10")));
    expect(result.nowItems.map((i) => i.id)).toEqual(["b"]);
    expect(result.nextItem?.id).toBe("c");
    expect(result.done.map((i) => i.id)).toEqual(["a"]);
  });

  it("hides unpublished items from visitors", () => {
    const schedule = [item({ id: "hidden", published: false })];
    const result = getNowNextLater(schedule, new Date(at("12:10")));
    expect(result.nowItems).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });
});

describe("applyLive", () => {
  it("folds an organiser override onto the published item", () => {
    const live: LiveState = {
      schedule: { x: { status: "live", effectiveStart: at("11:50") } },
      announcements: {},
      updatedAt: Date.now()
    };
    const [result] = applyLive([item()], live);
    expect(result.status).toBe("live");
    expect(result.effectiveStart).toBe(at("11:50"));
  });

  it("leaves items with no override untouched", () => {
    const original = item();
    const [result] = applyLive([original], { schedule: {}, announcements: {}, updatedAt: 0 });
    expect(result).toEqual(original);
  });
});

describe("liveStore", () => {
  it("accumulates repeated delays", () => {
    liveStore.reset();
    const base = item({ id: "delayme" });
    liveStore.delay("delayme", 10, base);
    liveStore.delay("delayme", 10, base);
    expect(liveStore.get().schedule.delayme.delayMinutes).toBe(20);
    expect(liveStore.get().schedule.delayme.effectiveStart).toBe(new Date(at("12:20")).toISOString());
    liveStore.reset();
  });
});

describe("event status and countdowns", () => {
  it("reports the festival as upcoming, live, then finished", () => {
    expect(eventStatus(seedData.event, new Date(at("08:59")))).toBe("upcoming");
    expect(eventStatus(seedData.event, new Date(at("09:00")))).toBe("live");
    expect(eventStatus(seedData.event, new Date(at("12:00")))).toBe("live");
    expect(eventStatus(seedData.event, new Date(at("17:00")))).toBe("finished");
  });

  it("formats a readable countdown", () => {
    expect(countdownLabel(at("12:30"), new Date(at("12:00")))).toBe("30 min");
    expect(countdownLabel(at("14:15"), new Date(at("12:00")))).toBe("2 hr 15 min");
    expect(countdownLabel(at("11:00"), new Date(at("12:00")))).toBe("moments");
  });

  it("breaks the countdown into days, hours and minutes", () => {
    const parts = countdownParts(at("10:00"), new Date(`${day}T08:30:00+10:00`));
    expect(parts).toMatchObject({ days: 0, hours: 1, minutes: 30, isPast: false });
  });
});

describe("content integrity", () => {
  it("points every schedule item at a real location", () => {
    const ids = new Set(seedData.locations.map((l) => l.id));
    seedData.schedule.forEach((s) => expect(ids.has(s.locationId), `${s.id} → ${s.locationId}`).toBe(true));
  });

  it("points every trail stop at a real location", () => {
    const ids = new Set(seedData.locations.map((l) => l.id));
    seedData.trailPoints.forEach((p) => expect(ids.has(p.locationId), `${p.slug} → ${p.locationId}`).toBe(true));
  });

  it("gives every trail stop a unique QR code", () => {
    const codes = seedData.trailPoints.flatMap((p) => p.qrCodes);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has no placeholder copy left in visitor-facing content", () => {
    const blob = JSON.stringify(seedData).toLowerCase();
    ["lorem", "seed/demo", "to be confirmed.", "example.com", "tbc", "draft listing", "placeholder"]
      .forEach((needle) => expect(blob.includes(needle), `found "${needle}"`).toBe(false));
  });

  it("keeps every location marker inside the map image", () => {
    seedData.locations.forEach((l) => {
      expect(l.mapX).toBeGreaterThanOrEqual(0);
      expect(l.mapX).toBeLessThanOrEqual(100);
      expect(l.mapY).toBeGreaterThanOrEqual(0);
      expect(l.mapY).toBeLessThanOrEqual(100);
    });
  });
});
