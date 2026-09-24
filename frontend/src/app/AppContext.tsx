import { createContext, useContext } from "react";
import type { Announcement, FestivalData, Locale, Location, ScheduleItem } from "../lib/types";
import type { VisitorProfile } from "../lib/auth/auth";

export type AppState = {
  data: FestivalData;
  /** Programme with organiser overrides folded in. */
  schedule: ScheduleItem[];
  /** Full programme used only inside the organiser console. */
  organiserSchedule: ScheduleItem[];
  /** Live organiser controls stay locked until server state has loaded. */
  organiserControlsReady: boolean;
  announcements: Announcement[];
  now: Date;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  profile: VisitorProfile | null;
  setProfile: (profile: VisitorProfile | null) => void;
  signOut: () => Promise<void>;
  /** Signed in? If not, opens the sign-in sheet and returns false. */
  requireSignIn: (reason: string) => boolean;
  toast: (message: string) => void;
  /** Bumps whenever local visitor data changes, so views re-render. */
  version: number;
  locationById: (id?: string) => Location | undefined;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <App>");
  return ctx;
}
