/* ------------------------------------------------------------------
   localFestival — everything the visitor does, stored on their own
   device. Nothing here leaves the browser. The privacy screen in
   My Festival reads and clears exactly these keys.
   ------------------------------------------------------------------ */

import type { Locale } from "../types";

const K = {
  saved: "ij26.savedScheduleIds",
  discovered: "ij26.discoveredTrailIds",
  discoveredAt: "ij26.discoveredAt",
  lastLocation: "ij26.lastScannedLocationId",
  locale: "ij26.locale",
  seenIntro: "ij26.seenIntro",
  dismissed: "ij26.dismissedAnnouncements"
} as const;

function readList(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(values)]));
  } catch {
    /* storage unavailable — this session stays in memory only */
  }
}

function readMap(key: string): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export type PassportState = {
  saved: string[];
  discovered: string[];
  discoveredAt: Record<string, string>;
  lastLocation: string | null;
};

export const localFestival = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  saved: () => readList(K.saved),
  isSaved: (id: string) => readList(K.saved).includes(id),
  toggleSaved(id: string) {
    const current = readList(K.saved);
    const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
    writeList(K.saved, next);
    emit();
    return next.includes(id);
  },

  discovered: () => readList(K.discovered),
  isDiscovered: (id: string) => readList(K.discovered).includes(id),
  discoveredAt: () => readMap(K.discoveredAt),
  /** Returns true when this is the first time the stop has been found. */
  discover(id: string, locationId?: string) {
    const current = readList(K.discovered);
    if (current.includes(id)) return false;
    writeList(K.discovered, [...current, id]);
    try {
      localStorage.setItem(
        K.discoveredAt,
        JSON.stringify({ ...readMap(K.discoveredAt), [id]: new Date().toISOString() })
      );
      if (locationId) localStorage.setItem(K.lastLocation, locationId);
    } catch {
      /* ignore */
    }
    emit();
    return true;
  },

  lastLocation: () => {
    try {
      return localStorage.getItem(K.lastLocation);
    } catch {
      return null;
    }
  },

  dismissed: () => readList(K.dismissed),
  dismiss(id: string) {
    writeList(K.dismissed, [...readList(K.dismissed), id]);
    emit();
  },

  seenIntro: () => {
    try {
      return localStorage.getItem(K.seenIntro) === "1";
    } catch {
      return true;
    }
  },
  markIntroSeen() {
    try {
      localStorage.setItem(K.seenIntro, "1");
    } catch {
      /* ignore */
    }
  },

  locale: (): Locale => {
    try {
      return (localStorage.getItem(K.locale) || "en") as Locale;
    } catch {
      return "en";
    }
  },
  setLocale(locale: Locale) {
    try {
      localStorage.setItem(K.locale, locale);
    } catch {
      /* ignore */
    }
    emit();
  },

  passport(): PassportState {
    return {
      saved: readList(K.saved),
      discovered: readList(K.discovered),
      discoveredAt: readMap(K.discoveredAt),
      lastLocation: this.lastLocation()
    };
  },

  mergePassport(remote: Partial<PassportState>) {
    const discoveredAt = { ...readMap(K.discoveredAt), ...(remote.discoveredAt ?? {}) };
    writeList(K.saved, [...readList(K.saved), ...(remote.saved ?? [])]);
    writeList(K.discovered, [...readList(K.discovered), ...(remote.discovered ?? [])]);
    try {
      localStorage.setItem(K.discoveredAt, JSON.stringify(discoveredAt));
      if (!this.lastLocation() && remote.lastLocation) localStorage.setItem(K.lastLocation, remote.lastLocation);
    } catch {
      /* ignore */
    }
    emit();
  },

  /** Clears everything this app has stored about the visitor. */
  reset() {
    Object.values(K).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    emit();
  }
};
