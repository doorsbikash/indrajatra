/* ------------------------------------------------------------------
   liveStore — everything an organiser can change on the day, held on
   top of the published content.

   Three kinds of override live here:

     1. Run state   — start / delay / complete / cancel an item.
     2. Run sheet   — edit a title, time or location; add or remove
                      items; replace the whole programme from a paste.
     3. Photos      — swap the festival hero or any trail stop photo.

   The organiser screen writes here; every visitor screen in the same
   browser profile reads here. Changes propagate instantly across tabs
   via BroadcastChannel, and across page loads via localStorage.

   LIMIT: this is per-browser. Two organisers on two phones do not see
   each other's changes. Use the JSON export/import to move a state
   between devices, or move the store server-side — swap the read/write
   pair for GET /api/live and POST /api/admin/live and nothing else in
   the app changes.
   ------------------------------------------------------------------ */

import type {
  Announcement, FestivalData, Listing, ScheduleItem, ScheduleStatus
} from "../types";

const KEY = "ij26.live.v1";
const CHANNEL = "ij26-live";

/** Refuse a write past this, so we never wedge the browser's quota. */
export const STORE_BUDGET = 3_600_000;

/** Fields an organiser may edit on a programme item. */
export type EditablePatch = {
  title?: string;
  summary?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  locationId?: string;
  categoryIds?: string[];
  highlight?: boolean;
};

export type ScheduleOverride = EditablePatch & {
  status?: ScheduleStatus;
  effectiveStart?: string;
  effectiveEnd?: string;
  delayMinutes?: number;
  /** Taken out of the programme by the organiser. */
  removed?: boolean;
};

/** An item the organiser added that is not in the published content. */
export type DraftItem = {
  id: string;
  title: string;
  summary?: string;
  scheduledStart: string;
  scheduledEnd?: string;
  locationId: string;
  categoryIds: string[];
  highlight?: boolean;
};

export type LiveState = {
  schedule: Record<string, ScheduleOverride>;
  announcements: Record<string, boolean>;
  /** Items added on the day. */
  added?: DraftItem[];
  /** Photo overrides: "hero", "trail:<id>", "sched:<id>" -> src. */
  media?: Record<string, string>;
  /** Visitor-facing tag overrides for stalls and food vendors. */
  listingCategories?: Record<string, string[]>;
  updatedAt: number;
};

export type WriteResult = { ok: boolean; reason?: string };

const empty: LiveState = {
  schedule: {}, announcements: {}, added: [], media: {}, listingCategories: {}, updatedAt: 0
};

let state: LiveState = read();
const listeners = new Set<(s: LiveState) => void>();

let channel: BroadcastChannel | null = null;
if (typeof BroadcastChannel !== "undefined") {
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      state = { ...empty, ...(event.data as LiveState) };
      listeners.forEach((fn) => fn(state));
    };
  } catch {
    channel = null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    state = read();
    listeners.forEach((fn) => fn(state));
  });
}

function read(): LiveState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as LiveState) } : { ...empty };
  } catch {
    return { ...empty };
  }
}

function commit(next: LiveState) {
  state = { ...next, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode or full quota — in-memory only for this session */
  }
  channel?.postMessage(state);
  listeners.forEach((fn) => fn(state));
}

/** Commit only if the result still fits in browser storage. */
function commitChecked(next: LiveState): WriteResult {
  const candidate = { ...next, updatedAt: Date.now() };
  let raw = "";
  try {
    raw = JSON.stringify(candidate);
  } catch {
    return { ok: false, reason: "That change could not be saved." };
  }
  if (raw.length > STORE_BUDGET) {
    return {
      ok: false,
      reason: "Browser storage for this app is nearly full. Remove a photo override first, or use a link instead of uploading."
    };
  }
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    return { ok: false, reason: "The browser refused to save — storage is full or private browsing is on." };
  }
  state = candidate;
  channel?.postMessage(state);
  listeners.forEach((fn) => fn(state));
  return { ok: true };
}

const added = () => state.added ?? [];
const media = () => state.media ?? {};
const isDraft = (id: string) => added().some((a) => a.id === id);

export const liveStore = {
  get: () => state,

  subscribe(fn: (s: LiveState) => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  /** Bytes currently used, and the ceiling, for the storage meter. */
  size() {
    let used = 0;
    try { used = JSON.stringify(state).length; } catch { used = 0; }
    return { used, budget: STORE_BUDGET };
  },

  /* ---------------- run state ---------------- */

  /** Mark an item live now, completed, cancelled, or back to scheduled. */
  setStatus(id: string, status: ScheduleStatus, now: Date) {
    const current = state.schedule[id] ?? {};
    const next: ScheduleOverride = { ...current, status };
    if (status === "live") {
      next.effectiveStart = now.toISOString();
      next.delayMinutes = undefined;
    }
    if (status === "completed") next.effectiveEnd = now.toISOString();
    if (status === "scheduled") {
      next.effectiveStart = undefined;
      next.effectiveEnd = undefined;
      next.delayMinutes = undefined;
    }
    commit({ ...state, schedule: { ...state.schedule, [id]: next } });
  },

  /** Push an item back by N minutes from its scheduled start. */
  delay(id: string, minutes: number, item: ScheduleItem) {
    const current = state.schedule[id] ?? {};
    const total = (current.delayMinutes ?? 0) + minutes;
    const base = new Date(current.scheduledStart ?? item.scheduledStart).getTime();
    commit({
      ...state,
      schedule: {
        ...state.schedule,
        [id]: {
          ...current,
          status: "delayed",
          delayMinutes: total,
          effectiveStart: new Date(base + total * 60_000).toISOString()
        }
      }
    });
  },

  setAnnouncement(id: string, published: boolean) {
    commit({ ...state, announcements: { ...state.announcements, [id]: published } });
  },

  /* ---------------- stalls ---------------- */

  setListingCategories(id: string, categories: string[]) {
    const listingCategories = { ...(state.listingCategories ?? {}) };
    listingCategories[id] = categories;
    commit({ ...state, listingCategories });
  },

  clearListingCategories(id: string) {
    const listingCategories = { ...(state.listingCategories ?? {}) };
    delete listingCategories[id];
    commit({ ...state, listingCategories });
  },

  /* ---------------- run sheet ---------------- */

  /** Change a title, time, location or tag list on any item. */
  editItem(id: string, patch: EditablePatch) {
    if (isDraft(id)) {
      commit({ ...state, added: added().map((a) => (a.id === id ? { ...a, ...patch } : a)) });
      return;
    }
    const current = state.schedule[id] ?? {};
    const next: ScheduleOverride = { ...current, ...patch };
    // A retimed item loses any delay that was measured off the old time.
    if (patch.scheduledStart !== undefined) {
      next.delayMinutes = undefined;
      if (next.status === "delayed") next.status = "scheduled";
      if (next.status !== "completed" && next.status !== "cancelled") {
        next.effectiveStart = undefined;
        next.effectiveEnd = undefined;
      }
    }
    commit({ ...state, schedule: { ...state.schedule, [id]: next } });
  },

  addItem(draft: Omit<DraftItem, "id"> & { id?: string }): string {
    const id = draft.id ?? `added-${Date.now().toString(36)}`;
    commit({ ...state, added: [...added(), { ...draft, id }] });
    return id;
  },

  /** Take an item off the programme (published items can be restored). */
  removeItem(id: string) {
    if (isDraft(id)) {
      commit({ ...state, added: added().filter((a) => a.id !== id) });
      return;
    }
    const current = state.schedule[id] ?? {};
    commit({ ...state, schedule: { ...state.schedule, [id]: { ...current, removed: true } } });
  },

  restoreItem(id: string) {
    const current = state.schedule[id];
    if (!current) return;
    const rest = { ...current };
    delete rest.removed;
    commit({ ...state, schedule: { ...state.schedule, [id]: rest } });
  },

  /** Swap the entire programme for a pasted run sheet. */
  replaceSchedule(drafts: DraftItem[], publishedIds: string[]) {
    const schedule: Record<string, ScheduleOverride> = {};
    publishedIds.forEach((id) => { schedule[id] = { removed: true }; });
    commit({ ...state, schedule, added: drafts });
  },

  /** Drop run-sheet edits but keep run state, photos and announcements. */
  clearEdits() {
    const schedule: Record<string, ScheduleOverride> = {};
    Object.entries(state.schedule).forEach(([id, o]) => {
      schedule[id] = {
        status: o.status, effectiveStart: o.effectiveStart,
        effectiveEnd: o.effectiveEnd, delayMinutes: o.delayMinutes
      };
    });
    commit({ ...state, schedule, added: [] });
  },

  /* ---------------- photos ---------------- */

  setMedia(key: string, src: string): WriteResult {
    return commitChecked({ ...state, media: { ...media(), [key]: src } });
  },

  clearMedia(key: string) {
    const next = { ...media() };
    delete next[key];
    commit({ ...state, media: next });
  },

  /* ---------------- move between devices ---------------- */

  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },

  importJson(raw: string): WriteResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "That is not valid JSON." };
    }
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, reason: "That file does not look like an organiser export." };
    }
    const candidate = parsed as Partial<LiveState>;
    if (!candidate.schedule && !candidate.added && !candidate.media) {
      return { ok: false, reason: "That file does not look like an organiser export." };
    }
    return commitChecked({ ...empty, ...candidate });
  },

  reset() {
    commit({ ...empty });
  }
};

/* ==================================================================
   Folding overrides onto published content
   ================================================================== */

function withOverride(item: ScheduleItem, o: ScheduleOverride | undefined, image?: string): ScheduleItem {
  if (!o && !image) return item;
  const patch = o ?? {};
  return {
    ...item,
    title: patch.title !== undefined ? { ...item.title, en: patch.title } : item.title,
    summary: patch.summary !== undefined ? { ...item.summary, en: patch.summary } : item.summary,
    scheduledStart: patch.scheduledStart ?? item.scheduledStart,
    scheduledEnd: patch.scheduledEnd ?? item.scheduledEnd,
    locationId: patch.locationId ?? item.locationId,
    categoryIds: patch.categoryIds ?? item.categoryIds,
    highlight: patch.highlight ?? item.highlight,
    status: patch.status ?? item.status,
    effectiveStart: patch.effectiveStart ?? item.effectiveStart,
    effectiveEnd: patch.effectiveEnd ?? item.effectiveEnd,
    delayMinutes: patch.delayMinutes ?? item.delayMinutes,
    image: image ? { src: image, alt: item.title } : item.image,
    updatedBy: "Organiser (live)"
  };
}

function draftToItem(draft: DraftItem, live: LiveState): ScheduleItem {
  const o = live.schedule?.[draft.id] ?? {};
  const image = live.media?.[`sched:${draft.id}`];
  return {
    id: draft.id,
    slug: draft.id,
    title: { en: draft.title },
    summary: { en: draft.summary ?? "" },
    scheduledStart: draft.scheduledStart,
    scheduledEnd: draft.scheduledEnd,
    status: o.status ?? "scheduled",
    effectiveStart: o.effectiveStart,
    effectiveEnd: o.effectiveEnd,
    delayMinutes: o.delayMinutes,
    locationId: draft.locationId,
    categoryIds: draft.categoryIds,
    highlight: Boolean(draft.highlight),
    image: image ? { src: image, alt: { en: draft.title } } : undefined,
    published: true,
    updatedAt: new Date(live.updatedAt || Date.now()).toISOString(),
    updatedBy: "Organiser (live)"
  };
}

/** Fold organiser overrides into the published programme. */
export function applyLive(items: ScheduleItem[], live: LiveState): ScheduleItem[] {
  const overrides = live.schedule ?? {};
  const kept = items
    .filter((item) => !overrides[item.id]?.removed)
    .map((item) => withOverride(item, overrides[item.id], live.media?.[`sched:${item.id}`]));
  const extra = (live.added ?? []).map((draft) => draftToItem(draft, live));
  if (!extra.length) return kept;
  return [...kept, ...extra].sort(
    (a, b) =>
      new Date(a.effectiveStart || a.scheduledStart).getTime() -
      new Date(b.effectiveStart || b.scheduledStart).getTime()
  );
}

export function applyLiveAnnouncements(items: Announcement[], live: LiveState): Announcement[] {
  return items.map((a) =>
    a.id in live.announcements ? { ...a, published: live.announcements[a.id] } : a
  );
}

/** Fold organiser tag changes onto visitor-facing stall listings. */
export function applyLiveListings(items: Listing[], live: LiveState): Listing[] {
  const overrides = live.listingCategories ?? {};
  if (!Object.keys(overrides).length) return items;
  return items.map((item) =>
    Object.prototype.hasOwnProperty.call(overrides, item.id)
      ? { ...item, categories: overrides[item.id] }
      : item
  );
}

/** Fold photo overrides onto the hero image and the trail stops. */
export function applyLiveMedia(data: FestivalData, live: LiveState): FestivalData {
  const overrides = live.media ?? {};
  if (!Object.keys(overrides).length) return data;

  const event = overrides.hero
    ? { ...data.event, heroMedia: { ...data.event.heroMedia, src: overrides.hero } }
    : data.event;

  const trailPoints = data.trailPoints.map((point) => {
    const src = overrides[`trail:${point.id}`];
    if (!src) return point;
    return {
      ...point,
      heroMedia: { src, alt: point.heroMedia?.alt ?? point.title, credit: point.heroMedia?.credit }
    };
  });

  return { ...data, event, trailPoints };
}
