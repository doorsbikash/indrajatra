/* ------------------------------------------------------------------
   liveStore - everything an organiser can change on the day, held on
   top of the published content.

   Three kinds of override live here:

     1. Run state   - start / delay / complete / cancel an item.
     2. Run sheet   - edit a title, time or location; add or remove
                      items; replace the whole programme from a paste.
     3. Photos      - swap the festival hero or any trail stop photo.

   The organiser screen writes here; every visitor screen in the same
   browser profile reads here. Changes propagate instantly across tabs
   via BroadcastChannel, and across page loads via localStorage.

   In API mode the same state is mirrored to the server. localStorage
   remains the fast local cache and offline fallback.
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
  revealOnStart?: boolean;
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
  revealOnStart?: boolean;
};

/** An announcement the organiser wrote on the day. */
export type DraftAnnouncement = {
  id: string;
  title: string;
  message: string;
  severity: Announcement["severity"];
  startsAt: string;
  endsAt?: string;
};

export type LiveState = {
  schedule: Record<string, ScheduleOverride>;
  announcements: Record<string, boolean>;
  /** Items added on the day. */
  added?: DraftItem[];
  /** Photo overrides: "hero", "trail:<id>", "sched:<id>" -> src. */
  media?: Record<string, string>;
  /** Announcements written on the day. */
  newAnnouncements?: DraftAnnouncement[];
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
let remoteCsrfToken: string | null = null;
let remoteEnabled = false;
let remoteTimer: number | null = null;

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
    /* private mode or full quota - in-memory only for this session */
  }
  channel?.postMessage(state);
  listeners.forEach((fn) => fn(state));
  scheduleRemoteWrite();
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
    return { ok: false, reason: "The browser refused to save - storage is full or private browsing is on." };
  }
  state = candidate;
  channel?.postMessage(state);
  listeners.forEach((fn) => fn(state));
  scheduleRemoteWrite();
  return { ok: true };
}

function scheduleRemoteWrite() {
  if (!remoteEnabled || !remoteCsrfToken || typeof window === "undefined") return;
  if (remoteTimer !== null) window.clearTimeout(remoteTimer);
  remoteTimer = window.setTimeout(() => {
    remoteTimer = null;
    void fetch("/api/admin/live", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": remoteCsrfToken as string },
      body: JSON.stringify({ state })
    }).catch(() => undefined);
  }, 250);
}

const added = () => state.added ?? [];
const newNotices = () => state.newAnnouncements ?? [];
const media = () => state.media ?? {};
const isDraft = (id: string) => added().some((a) => a.id === id);

export const liveStore = {
  get: () => state,

  configureRemote(csrfToken: string | null, enabled: boolean) {
    remoteCsrfToken = csrfToken;
    remoteEnabled = enabled;
  },

  hydrate(next: LiveState) {
    state = { ...empty, ...next };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* offline cache is optional */ }
    channel?.postMessage(state);
    listeners.forEach((fn) => fn(state));
  },

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

  /** Write a new announcement. It starts unpublished - nothing is pushed
      to visitors until the organiser presses Publish on it. */
  addAnnouncement(draft: Omit<DraftAnnouncement, "id"> & { id?: string }): string {
    const id = draft.id ?? `notice-${Date.now().toString(36)}`;
    commit({ ...state, newAnnouncements: [...newNotices(), { ...draft, id }] });
    return id;
  },

  /** Remove an announcement the organiser wrote. Published ones are only
      unpublished - the content in data.ts is never deleted from here. */
  removeAnnouncement(id: string) {
    const announcements = { ...state.announcements };
    delete announcements[id];
    commit({
      ...state,
      announcements,
      newAnnouncements: newNotices().filter((a) => a.id !== id)
    });
  },

  isOrganiserAnnouncement(id: string) {
    return newNotices().some((a) => a.id === id);
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
    revealOnStart: patch.revealOnStart ?? item.revealOnStart,
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
    revealOnStart: Boolean(draft.revealOnStart),
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

/** Replace unrevealed event-day items with one neutral visitor entry. */
export function applyVisitorVisibility(items: ScheduleItem[], live: LiveState): ScheduleItem[] {
  const guarded = items.filter((item) => item.revealOnStart);
  const revealed = (item: ScheduleItem) => {
    const override = live.schedule?.[item.id];
    return Boolean(
      override?.effectiveStart &&
      (override.status === "live" || override.status === "completed" || override.status === "cancelled")
    );
  };
  const hidden = guarded.filter((item) => !revealed(item));
  if (!hidden.length) return items;

  const visible = items.filter((item) => !item.revealOnStart || revealed(item));
  const starts = guarded.map((item) => new Date(item.scheduledStart).getTime());
  const ends = guarded.map((item) => new Date(item.scheduledEnd ?? item.scheduledStart).getTime());
  const start = new Date(Math.min(...starts)).toISOString();
  const end = new Date(Math.max(...ends)).toISOString();
  const placeholder: ScheduleItem = {
    id: "formal-programme-placeholder",
    slug: "formal-programme-placeholder",
    title: { en: "Formal programme" },
    summary: { en: "Guest addresses and formal proceedings continue on the main stage. The running order will update live." },
    scheduledStart: start,
    scheduledEnd: end,
    status: "scheduled",
    locationId: guarded[0]?.locationId ?? "main-stage",
    categoryIds: ["main-stage", "community"],
    published: true,
    updatedAt: new Date(live.updatedAt || Date.now()).toISOString(),
    updatedBy: "Newa Guthi Victoria"
  };

  return [...visible, placeholder].sort(
    (a, b) => new Date(a.effectiveStart || a.scheduledStart).getTime() - new Date(b.effectiveStart || b.scheduledStart).getTime()
  );
}

export function applyLiveAnnouncements(items: Announcement[], live: LiveState): Announcement[] {
  const base = items.map((a) =>
    a.id in live.announcements ? { ...a, published: live.announcements[a.id] } : a
  );
  const written = (live.newAnnouncements ?? []).map<Announcement>((draft) => ({
    id: draft.id,
    title: { en: draft.title },
    message: { en: draft.message },
    severity: draft.severity,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    published: live.announcements[draft.id] ?? false
  }));
  return written.length ? [...base, ...written] : base;
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
