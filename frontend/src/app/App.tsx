import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppContext, type AppState } from "./AppContext";
import { Shell } from "./Shell";
import { SignInSheet } from "../components/SignInSheet";
import { getRepository } from "../lib/repositories/repository";
import { auth, type VisitorProfile } from "../lib/auth/auth";
import { localFestival } from "../lib/storage/localFestival";
import {
  applyLive, applyLiveAnnouncements, applyLiveListings, applyLiveMedia, liveStore
} from "../lib/live/liveStore";
import { clock, startTicker } from "../lib/clock/clock";
import type { FestivalData, Locale } from "../lib/types";
import type { PassportState } from "../lib/storage/localFestival";
import type { LiveState } from "../lib/live/liveStore";

import { HomePage } from "../pages/Home";
import { SchedulePage } from "../pages/Schedule";
import { ExplorePage } from "../pages/Explore";
import { TrailPointPage } from "../pages/TrailPoint";
import { ScanPage } from "../pages/Scan";
import { MapPage } from "../pages/MapPage";
import { DirectoryPage } from "../pages/Directory";
import { MyFestivalPage } from "../pages/MyFestival";
import { InfoPage } from "../pages/Info";
import { MembershipPage } from "../pages/Membership";
import { AdminPage } from "../pages/Admin";
import { VolunteerRegisterPage } from "../pages/VolunteerRegister";
import { NotFoundPage } from "../pages/NotFound";

const organiserEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ORGANISER === "true";

export default function App() {
  const [data, setData] = useState<FestivalData | null>(null);
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(localFestival.locale());
  const [live, setLive] = useState(liveStore.get());
  const [version, setVersion] = useState(0);
  const [tick, setTick] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [signInReason, setSignInReason] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([getRepository().getData(), auth.current()])
      .then(([festival, visitor]) => {
        setData(festival);
        setProfile(visitor);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    liveStore.configureRemote(profile?.csrfToken ?? null, profile?.role === "organiser");
  }, [profile]);

  useEffect(() => {
    if (!auth.usesApi) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/live", { credentials: "include" });
        if (!response.ok) return;
        const payload = await response.json() as { state: LiveState | null };
        if (active && payload.state) liveStore.hydrate(payload.state);
      } catch {
        // Keep the cached live state while offline.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!auth.usesApi || !profile?.csrfToken) return;
    let syncing = false;
    const save = async () => {
      if (syncing) return;
      syncing = true;
      try {
        await fetch("/api/passport", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": profile.csrfToken as string },
          body: JSON.stringify({ state: localFestival.passport() })
        });
      } finally {
        syncing = false;
      }
    };
    void fetch("/api/passport", { credentials: "include" })
      .then(async (response) => response.ok ? response.json() as Promise<{ state: PassportState | null }> : null)
      .then((payload) => {
        if (payload?.state) localFestival.mergePassport(payload.state);
        void save();
      })
      .catch(() => undefined);
    return localFestival.subscribe(() => void save());
  }, [profile?.email, profile?.csrfToken]);

  useEffect(() => liveStore.subscribe(setLive), []);
  useEffect(() => localFestival.subscribe(() => setVersion((v) => v + 1)), []);
  useEffect(() => clock.subscribe(() => setTick((v) => v + 1)), []);
  useEffect(() => startTicker(20_000), []);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage((current) => (current === message ? null : current)), 2600);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    localFestival.setLocale(next);
    setLocaleState(next);
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout();
    liveStore.configureRemote(null, false);
    setProfile(null);
  }, []);

  const requireSignIn = useCallback(
    (reason: string) => {
      if (profile) return true;
      setSignInReason(reason);
      return false;
    },
    [profile]
  );

  const value = useMemo<AppState | null>(() => {
    if (!data) return null;
    void tick;
    // Organiser photo swaps are folded in before anything reads the content.
    const mediaView = applyLiveMedia(data, live);
    const view = { ...mediaView, listings: applyLiveListings(mediaView.listings, live) };
    return {
      data: view,
      schedule: applyLive(view.schedule, live),
      announcements: applyLiveAnnouncements(view.announcements, live),
      now: clock.now(),
      locale,
      setLocale,
      profile,
      setProfile,
      signOut,
      requireSignIn,
      toast,
      version,
      locationById: (id?: string) => view.locations.find((l) => l.id === id)
    };
  }, [data, live, locale, setLocale, profile, signOut, requireSignIn, toast, version, tick]);

  if (!ready || !value) {
    return (
      <main className="splash">
        <img className="splash__mark" src="/brand/ngv-mark.png" alt="Newa Guthi Victoria" width={72} height={72} />
        <p className="small" style={{ color: "rgba(255,255,255,.66)" }}>Loading the festival…</p>
      </main>
    );
  }

  return (
    <AppContext.Provider value={value}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell toast={toastMessage} />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/trail/:slug" element={<TrailPointPage />} />
            <Route path="/scan/:code" element={<ScanPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/my" element={<MyFestivalPage />} />
            <Route path="/info" element={<InfoPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/volunteer" element={<VolunteerRegisterPage />} />
            {organiserEnabled && <Route path="/organiser" element={<AdminPage />} />}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {signInReason && (
        <SignInSheet
          reason={signInReason}
          onClose={() => setSignInReason(null)}
          onSignedIn={(visitor) => {
            setProfile(visitor);
            setSignInReason(null);
            toast(`Welcome, ${visitor.firstName}`);
          }}
        />
      )}
    </AppContext.Provider>
  );
}
