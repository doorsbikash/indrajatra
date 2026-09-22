import type { EventConfig, ScheduleItem } from "../types";

const TZ = "Australia/Melbourne";

export function effectiveStart(item: ScheduleItem): Date {
  return new Date(item.effectiveStart || item.scheduledStart);
}

export function effectiveEnd(item: ScheduleItem): Date {
  const fallback = effectiveStart(item).getTime() + 45 * 60_000;
  return new Date(item.effectiveEnd || item.scheduledEnd || fallback);
}

export function eventStatus(event: EventConfig, now = new Date()): "upcoming" | "live" | "finished" {
  if (event.statusOverride) return event.statusOverride;
  if (now < new Date(event.startAt)) return "upcoming";
  if (now > new Date(event.endAt)) return "finished";
  return "live";
}

/** Where an item sits right now, taking organiser overrides into account. */
export function itemState(
  item: ScheduleItem,
  now = new Date()
): "scheduled" | "live" | "completed" | "cancelled" | "delayed" {
  if (item.status === "cancelled") return "cancelled";
  if (item.status === "completed") return "completed";
  if (item.status === "live") return "live";
  const start = effectiveStart(item).getTime();
  const end = effectiveEnd(item).getTime();
  const t = now.getTime();
  if (t > end) return "completed";
  if (t >= start) return "live";
  if (item.status === "delayed") return "delayed";
  return "scheduled";
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ
  }).format(new Date(iso));
}

export function formatHour(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ
  }).format(new Date(iso));
}

export function getNowNextLater(schedule: ScheduleItem[], now = new Date()) {
  const published = schedule.filter((item) => item.published);
  const nowItems = published.filter((item) => itemState(item, now) === "live");
  const upcoming = published
    .filter((item) => {
      const state = itemState(item, now);
      return state === "scheduled" || state === "delayed";
    })
    .sort((a, b) => effectiveStart(a).getTime() - effectiveStart(b).getTime());
  const done = published
    .filter((item) => itemState(item, now) === "completed")
    .sort((a, b) => effectiveStart(b).getTime() - effectiveStart(a).getTime());
  return { nowItems, nextItem: upcoming[0], later: upcoming.slice(1, 4), upcoming, done };
}

export function countdownLabel(iso: string, now = new Date()): string {
  const minutes = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return "moments";
  if (minutes < 60) return `${minutes} min`;
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours ? `${days} day${days === 1 ? "" : "s"} ${hours} hr` : `${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** Days / hours / minutes until the event opens. */
export function countdownParts(iso: string, now = new Date()) {
  const diff = Math.max(0, new Date(iso).getTime() - now.getTime());
  const totalMinutes = Math.floor(diff / 60_000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    isPast: diff === 0
  };
}
