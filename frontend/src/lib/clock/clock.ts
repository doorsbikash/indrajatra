/* ------------------------------------------------------------------
   clock — the app's single source of "now".

   On festival day this is just the wall clock. Before and after, it
   runs in preview mode against a simulated festival-day time so that
   Now / Next / Later, countdowns and live states can be demonstrated
   and tested. Preview is always visible to the user via the bar at
   the top of the screen — it never silently lies about the time.
   ------------------------------------------------------------------ */

import { FESTIVAL_DAY } from "../../content/seed/data";

const KEY = "ij26.preview.iso";
const OPEN = new Date(`${FESTIVAL_DAY}T08:30:00+10:00`).getTime();
const CLOSE = new Date(`${FESTIVAL_DAY}T16:30:00+10:00`).getTime();

/** Default simulated moment: mid-morning, with a chariot on the move. */
export const DEFAULT_PREVIEW = `${FESTIVAL_DAY}T11:42:00+10:00`;

let previewIso: string | null = readStored();
const listeners = new Set<() => void>();

function readStored(): string | null {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  const now = Date.now();
  return now >= OPEN && now <= CLOSE ? null : DEFAULT_PREVIEW;
}

function emit() {
  listeners.forEach((fn) => fn());
}

export const clock = {
  /** True when the real wall clock is inside the festival window. */
  isFestivalDay: () => {
    const now = Date.now();
    return now >= OPEN && now <= CLOSE;
  },

  isPreview: () => previewIso !== null,

  previewIso: () => previewIso,

  now(): Date {
    return previewIso ? new Date(previewIso) : new Date();
  },

  setPreview(iso: string | null) {
    previewIso = iso;
    try {
      if (iso) sessionStorage.setItem(KEY, iso);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    emit();
  },

  /** Jump the preview clock to a given minute of festival day. */
  setPreviewMinutes(minutesFromOpen: number) {
    const base = new Date(`${FESTIVAL_DAY}T10:00:00+10:00`).getTime();
    clock.setPreview(new Date(base + minutesFromOpen * 60_000).toISOString());
  },

  minutesFromOpen(): number {
    const base = new Date(`${FESTIVAL_DAY}T10:00:00+10:00`).getTime();
    return Math.round((clock.now().getTime() - base) / 60_000);
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }
};

/** Ticks every `ms` so live views stay current without a page reload. */
export function startTicker(ms = 30_000) {
  const id = window.setInterval(emit, ms);
  return () => window.clearInterval(id);
}
