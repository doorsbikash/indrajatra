import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, Clock, Compass, Home, MapPinned, ShieldCheck, Sparkles, Star, Store } from "lucide-react";
import { useApp } from "./AppContext";
import { clock } from "../lib/clock/clock";
import { formatTime } from "../lib/dates/schedule";
import { localFestival } from "../lib/storage/localFestival";
import { SiteFooter } from "../components/SiteFooter";
import { trackEvent } from "../lib/analytics/track";

const NAV = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/schedule", icon: CalendarDays, label: "What's on", end: false },
  { to: "/map", icon: MapPinned, label: "Map", end: false },
  { to: "/directory", icon: Store, label: "Stalls", end: false },
  { to: "/explore", icon: Compass, label: "Trail", end: false },
  { to: "/my", icon: Star, label: "Mine", end: false }
] as const;

export function Shell({ toast }: { toast: string | null }) {
  const { profile, data, now, version } = useApp();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    trackEvent("page_view");
  }, [pathname]);

  void version;
  const discovered = localFestival.discovered().length;
  const total = data.trailPoints.length;

  return (
    <div className="shell">
      <header className={`appbar${scrolled ? " appbar--scrolled" : ""}`}>
        <div className="appbar__inner">
          <Link to="/" className="brand" aria-label={`${data.event.brandName} - Indra Jatra 2026, home`}>
            <img className="brand__mark" src="/brand/ngv-mark.png" alt="" width={38} height={38} />
            <span className="brand__text">
              <span className="brand__org">{data.event.brandName}</span>
              <strong className="brand__event">Indra Jatra 2026</strong>
            </span>
          </Link>
          {profile?.role === "organiser" ? (
            <Link
              to="/organiser"
              className={`organiser-shortcut${pathname === "/organiser" ? " organiser-shortcut--active" : ""}`}
              aria-label="Return to organiser console"
            >
              <ShieldCheck size={17} />
              <span>Organiser</span>
            </Link>
          ) : (
            <Link
              to="/my"
              className={`avatar${profile ? "" : " avatar--guest"}`}
              aria-label={profile ? `Signed in as ${profile.firstName}` : "My Festival"}
            >
              {profile ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}` : <Star size={16} />}
            </Link>
          )}
        </div>
      </header>

      <PreviewBar now={now} />

      <Outlet />

      <SiteFooter />

      <nav className="bottom-nav" aria-label="Primary">
        <div className="bottom-nav__inner">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={21} strokeWidth={2} />
              <span>{label}</span>
              {to === "/explore" && discovered > 0 && discovered < total && (
                <span className="nav-badge" aria-hidden>{discovered}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {toast && (
        <div className="toast" role="status">
          <Sparkles size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function PreviewBar({ now }: { now: Date }) {
  const [, force] = useState(0);
  useEffect(() => clock.subscribe(() => force((v) => v + 1)), []);
  if (!clock.isPreview()) return null;

  return (
    <div className="preview-bar">
      <div className="preview-bar__inner">
        <Clock size={13} />
        <span>
          Preview - showing Saturday 26 September, {formatTime(now.toISOString())}
        </span>
        <button type="button" onClick={() => clock.setPreview(null)}>
          Use real time
        </button>
      </div>
    </div>
  );
}
