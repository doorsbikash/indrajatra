import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban, CheckCheck, Clock, Image, ListOrdered, Megaphone, Play, QrCode, Radio, Store, Users,
  RotateCcw, ShieldAlert, Trash2, Undo2
} from "lucide-react";
import { useApp } from "../app/AppContext";
import { liveStore } from "../lib/live/liveStore";
import { clock, DEFAULT_PREVIEW } from "../lib/clock/clock";
import { formatTime, itemState } from "../lib/dates/schedule";
import { RunSheetEditor } from "../components/admin/RunSheetEditor";
import { PhotoManager } from "../components/admin/PhotoManager";
import { AnnouncementComposer } from "../components/admin/AnnouncementComposer";
import { StallEditor } from "../components/admin/StallEditor";
import { VolunteerManager } from "../components/admin/VolunteerManager";
import { AttendeeCheckIn } from "../components/admin/AttendeeCheckIn";
import { FESTIVAL_DAY } from "../content/seed/data";
import { t } from "../lib/text";

type Tab = "live" | "checkin" | "volunteers" | "runsheet" | "stalls" | "photos";

const TABS: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: "live", label: "Run the day", icon: Radio },
  { id: "checkin", label: "Check-in", icon: QrCode },
  { id: "volunteers", label: "Volunteers", icon: Users },
  { id: "runsheet", label: "Run sheet", icon: ListOrdered },
  { id: "stalls", label: "Stalls", icon: Store },
  { id: "photos", label: "Photos", icon: Image }
];

export function AdminPage() {
  const { data, schedule, announcements, now, locale, toast, profile, requireSignIn } = useApp();
  const [tab, setTab] = useState<Tab>("live");
  const [, force] = useState(0);
  useEffect(() => liveStore.subscribe(() => force((v) => v + 1)), []);

  const live = schedule.filter((i) => itemState(i, now) === "live").length;
  const done = schedule.filter((i) => itemState(i, now) === "completed").length;
  const delayed = schedule.filter((i) => i.status === "delayed").length;
  const minutes = clock.minutesFromOpen();

  if (!profile) {
    return (
      <main className="page">
        <p className="eyebrow">Organiser console</p>
        <h1>Sign in to continue</h1>
        <p className="lead">Use an organiser email to manage the live programme, stalls and announcements.</p>
        <button className="btn btn--primary" type="button" onClick={() => requireSignIn("Organiser sign in")}>Sign in</button>
      </main>
    );
  }

  if (profile.role !== "organiser") {
    return (
      <main className="page">
        <p className="eyebrow">Organiser console</p>
        <h1>Access restricted</h1>
        <p className="lead">This festival pass does not have organiser access.</p>
        <Link className="btn" to="/">Back to festival</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="eyebrow">Organiser console</p>
      <h1>Run the day</h1>
      <p className="lead">
        Changes here appear on visitor screens within seconds. Use it from the stage or the Media Station.
      </p>

      <div className="card card--notice">
        <p className="small" style={{ display: "flex", gap: 10, margin: 0 }}>
          <ShieldAlert size={17} style={{ flex: "0 0 auto", color: "var(--marigold-400)", marginTop: 2 }} />
          <span>Signed in as {profile.email}. Live changes are shared across organiser devices and visitor screens.</span>
        </p>
      </div>

      <div className="admin-tabs" role="group" aria-label="Organiser sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === "runsheet" && (
        <RunSheetEditor
          schedule={schedule}
          published={data.schedule}
          locations={data.locations}
          day={FESTIVAL_DAY}
          toast={toast}
        />
      )}

      {tab === "photos" && <PhotoManager data={data} schedule={schedule} toast={toast} />}

      {tab === "stalls" && <StallEditor listings={data.listings} toast={toast} />}

      {tab === "volunteers" && <VolunteerManager csrfToken={profile.csrfToken || ""} toast={toast} />}

      {tab === "checkin" && <AttendeeCheckIn csrfToken={profile.csrfToken || ""} />}

      {tab === "live" && (
        <>
          <section className="section">
            <div className="stat-row">
              <div className="stat"><b>{live}</b><span>On now</span></div>
              <div className="stat"><b>{delayed}</b><span>Delayed</span></div>
              <div className="stat"><b>{done}/{schedule.length}</b><span>Done</span></div>
            </div>
          </section>

          <section className="section">
            <h2>Demo clock</h2>
            <div className="card">
              <p className="small muted">
                Move the clock to rehearse the day. Visitors see a Preview banner whenever this is
                not real time, and it switches to the real clock automatically on 26 September.
              </p>
              <p className="row row--between" style={{ margin: "var(--s-3) 0 6px" }}>
                <span className="event-card__time" style={{ fontSize: "var(--step-1)" }}>
                  {formatTime(now.toISOString())}
                </span>
                <span className="tiny muted">{clock.isPreview() ? "Preview clock" : "Real time"}</span>
              </p>
              <input
                className="range"
                type="range"
                min={-45}
                max={400}
                step={5}
                value={Math.min(400, Math.max(-45, minutes))}
                onChange={(e) => clock.setPreviewMinutes(Number(e.target.value))}
                aria-label="Simulated time of day"
              />
              <div className="row" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn--sm" onClick={() => clock.setPreview(DEFAULT_PREVIEW)}>
                  <Clock size={14} />Mid-morning
                </button>
                <button type="button" className="btn btn--sm" onClick={() => clock.setPreview(null)}>
                  <Undo2 size={14} />Real time
                </button>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h2>Programme</h2>
              <button
                type="button"
                className="section__link"
                style={{ background: "none", border: 0, cursor: "pointer" }}
                onClick={() => {
                  if (!window.confirm("Clear every live override — run sheet edits, photos and announcements — and go back to the published content?")) return;
                  liveStore.reset();
                  toast("Everything reset");
                }}
              >
                <RotateCcw size={14} />Reset all
              </button>
            </div>

            <div className="stack">
              {schedule.map((item) => {
                const state = itemState(item, now);
                return (
                  <div key={item.id} className={`admin-row admin-row--${state}`}>
                    <div className="row row--between" style={{ flexWrap: "nowrap", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="event-card__time">
                          {formatTime(item.effectiveStart || item.scheduledStart)}
                        </span>
                        <h3 style={{ margin: "2px 0 0" }}>{t(item.title, locale)}</h3>
                        <p className="tiny muted" style={{ margin: "3px 0 0" }}>
                          {state}{item.delayMinutes ? ` · +${item.delayMinutes} min` : ""} · {item.updatedBy}
                        </p>
                      </div>
                    </div>
                    <div className="admin-row__ctrls">
                      <button type="button" className="btn btn--sm btn--jade"
                        onClick={() => { liveStore.setStatus(item.id, "live", now); toast(`${item.title.en} is live`); }}>
                        <Play size={14} />Start
                      </button>
                      <button type="button" className="btn btn--sm"
                        onClick={() => { liveStore.delay(item.id, 10, item); toast("Pushed back 10 minutes"); }}>
                        <Clock size={14} />+10 min
                      </button>
                      <button type="button" className="btn btn--sm"
                        onClick={() => { liveStore.setStatus(item.id, "completed", now); toast("Marked complete"); }}>
                        <CheckCheck size={14} />Done
                      </button>
                      <button type="button" className="btn btn--sm btn--danger"
                        onClick={() => {
                          if (!window.confirm(`Cancel "${item.title.en}"? Visitors will see it struck out immediately.`)) return;
                          liveStore.setStatus(item.id, "cancelled", now);
                          toast("Cancelled");
                        }}>
                        <Ban size={14} />Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="section">
            <h2>Announcements</h2>
            <p className="small muted">
              Publishing pushes a banner to the home screen. Emergency notices are red, full width
              and cannot be dismissed — use that severity only for a genuine emergency.
            </p>
            <div className="stack" style={{ marginTop: "var(--s-3)" }}>
              {announcements.map((a) => (
                <div className="card row" key={a.id} style={{ gap: 12, flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <span className={`icon-disc${a.severity === "emergency" ? "" : a.severity === "info" ? " icon-disc--jade" : " icon-disc--gold"}`}>
                    <Megaphone size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "var(--step-0)" }}>{t(a.title, locale)}</strong>
                    <span className="small muted">{t(a.message, locale)}</span>
                    <div className="row" style={{ marginTop: 10 }}>
                      <span className={`pill${a.severity === "emergency" ? " pill--cancelled" : ""}`}>{a.severity}</span>
                      <button
                        type="button"
                        className={`btn btn--sm${a.published ? " btn--danger" : " btn--primary"}`}
                        onClick={() => {
                          if (!a.published && a.severity === "emergency"
                            && !window.confirm("Publish an EMERGENCY notice to every visitor screen?")) return;
                          liveStore.setAnnouncement(a.id, !a.published);
                          toast(a.published ? "Unpublished" : "Published to all visitors");
                        }}
                      >
                        {a.published ? "Unpublish" : "Publish"}
                      </button>
                      {liveStore.isOrganiserAnnouncement(a.id) && (
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => {
                            if (!window.confirm(`Delete "${a.title.en}"? It is removed from the console entirely.`)) return;
                            liveStore.removeAnnouncement(a.id);
                            toast("Deleted");
                          }}
                        >
                          <Trash2 size={14} />Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "var(--s-4)" }}>
              <AnnouncementComposer now={now} toast={toast} />
            </div>
          </section>

          <section className="section">
            <div className="card card--sunk">
              <h3>Try it</h3>
              <p className="small muted">
                Open the visitor home screen in a second tab, then start an item or publish an
                announcement here. The other tab updates without a refresh.
              </p>
              <Link className="btn btn--sm" to="/" target="_blank">Open visitor view</Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
