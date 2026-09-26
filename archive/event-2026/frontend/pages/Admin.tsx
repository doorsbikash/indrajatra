import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban, BarChart3, CheckCheck, Clock, Image, ListOrdered, Megaphone, Play, Radio, ShieldCheck, Store, Users,
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
import { OrganiserAccessRequest } from "../components/admin/OrganiserAccessRequest";
import { OrganiserRequestManager } from "../components/admin/OrganiserRequestManager";
import { AnalyticsDashboard } from "../components/admin/AnalyticsDashboard";
import { FESTIVAL_DAY } from "../content/seed/data";
import { t } from "../lib/text";

type Tab = "live" | "access" | "volunteers" | "runsheet" | "stalls" | "photos" | "reports";

const TABS: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: "live", label: "Run the day", icon: Radio },
  { id: "access", label: "Access requests", icon: ShieldCheck },
  { id: "volunteers", label: "Volunteers", icon: Users },
  { id: "runsheet", label: "Run sheet", icon: ListOrdered },
  { id: "stalls", label: "Stalls", icon: Store },
  { id: "photos", label: "Photos", icon: Image }
];

export function AdminPage() {
  const {
    data, organiserSchedule: schedule, organiserControlsReady, announcements,
    now, locale, toast, profile, requireSignIn
  } = useApp();
  const [tab, setTab] = useState<Tab>("live");
  const [nextDecision, setNextDecision] = useState<{ afterId: string; nextId: string } | null>(null);
  const [, force] = useState(0);
  const isReadOnlyStaging = window.location.hostname.startsWith("staging-");
  useEffect(() => liveStore.subscribe(() => force((v) => v + 1)), []);

  const live = schedule.filter((i) => itemState(i, now) === "live").length;
  const done = schedule.filter((i) => itemState(i, now) === "completed").length;
  const delayed = schedule.filter((i) => i.status === "delayed").length;
  const minutes = clock.minutesFromOpen();
  const isPreview = clock.isPreview();
  const previewBlocksLiveChanges = isPreview && !isReadOnlyStaging;
  const liveControlsBlocked = previewBlocksLiveChanges || !organiserControlsReady;

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
    return <main className="page"><OrganiserAccessRequest csrfToken={profile.csrfToken || ""} /><Link className="btn btn--quiet" to="/">Back to festival</Link></main>;
  }

  return (
    <main className="page">
      <p className="eyebrow">Organiser console</p>
      <h1>Run the day</h1>
      <p className="lead">
        {isReadOnlyStaging
          ? "Staging is for rehearsal and feedback. Changes stay on this device and do not affect the live event."
          : "Changes here appear on visitor screens within seconds. Use it from the stage or the Media Station."}
      </p>

      <div className="card card--notice">
        <p className="small" style={{ display: "flex", gap: 10, margin: 0 }}>
          <ShieldAlert size={17} style={{ flex: "0 0 auto", color: "var(--marigold-400)", marginTop: 2 }} />
          <span>
            Signed in as {profile.email}. {isReadOnlyStaging
              ? "This is read-only staging; use the live app for event-day changes."
              : "Live changes are shared across organiser devices and visitor screens."}
          </span>
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
        {profile.isMaster && <button
          type="button"
          className="chip"
          aria-pressed={tab === "reports"}
          onClick={() => setTab("reports")}
        >
          <BarChart3 size={14} />Visitor reports
        </button>}
      </div>

      {tab === "reports" && profile.isMaster && <AnalyticsDashboard />}

      {tab === "runsheet" && (
        <RunSheetEditor
          schedule={schedule}
          published={data.schedule}
          locations={data.locations}
          day={FESTIVAL_DAY}
          canManageBackups={Boolean(profile.isMaster)}
          toast={toast}
        />
      )}

      {tab === "photos" && <PhotoManager data={data} schedule={schedule} toast={toast} />}

      {tab === "stalls" && <StallEditor listings={data.listings} toast={toast} />}

      {tab === "volunteers" && <VolunteerManager csrfToken={profile.csrfToken || ""} toast={toast} />}

      {tab === "access" && <OrganiserRequestManager csrfToken={profile.csrfToken || ""} toast={toast} />}

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
                Move the clock to rehearse the day on this device. Rehearsal changes are not sent
                to public visitor screens. Return to real time before making live changes.
              </p>
              <p className="row row--between" style={{ margin: "var(--s-3) 0 6px" }}>
                <span className="event-card__time" style={{ fontSize: "var(--step-1)" }}>
                  {formatTime(now.toISOString())}
                </span>
                <span className="tiny muted">{isPreview ? "Preview clock" : "Real time"}</span>
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
                disabled={liveControlsBlocked}
                onClick={() => {
                  if (!window.confirm("Clear every live override - run sheet edits, photos and announcements - and go back to the published content?")) return;
                  liveStore.reset();
                  toast("Everything reset");
                }}
              >
                <RotateCcw size={14} />Reset all
              </button>
            </div>

            {previewBlocksLiveChanges && (
              <div className="card card--notice" style={{ marginBottom: "var(--s-4)" }}>
                <p className="small" style={{ margin: 0 }}>
                  Preview clock is active. Return to <strong>Real time</strong> before starting,
                  delaying, completing or cancelling programme items.
                </p>
              </div>
            )}

            {!isReadOnlyStaging && !isPreview && !organiserControlsReady && (
              <div className="card card--notice" style={{ marginBottom: "var(--s-4)" }}>
                <p className="small" style={{ margin: 0 }}>
                  Loading the latest live programme. Controls will unlock when the server is ready.
                </p>
              </div>
            )}

            <div className="stack">
              {schedule.map((item, index) => {
                const state = itemState(item, now);
                const hasRunOverride = item.status !== "scheduled" || Boolean(
                  item.effectiveStart || item.effectiveEnd || item.delayMinutes
                );
                const decisionItem = nextDecision?.afterId === item.id
                  ? schedule.find((candidate) => candidate.id === nextDecision.nextId)
                  : undefined;
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
                        {item.revealOnStart && !item.effectiveStart && (
                          <p className="tiny" style={{ margin: "4px 0 0", color: "var(--maroon-700)" }}>
                            Hidden from visitors until Start
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="admin-row__ctrls">
                      <button type="button" className="btn btn--sm btn--jade" disabled={liveControlsBlocked}
                        onClick={() => { liveStore.setStatus(item.id, "live", now); toast(`${item.title.en} is live`); }}>
                        <Play size={14} />Start
                      </button>
                      <button type="button" className="btn btn--sm" disabled={liveControlsBlocked}
                        onClick={() => { liveStore.delay(item.id, 10, item); toast("Pushed back 10 minutes"); }}>
                        <Clock size={14} />+10 min
                      </button>
                      <button type="button" className="btn btn--sm" disabled={liveControlsBlocked}
                        onClick={() => {
                          liveStore.setStatus(item.id, "completed", now);
                          const next = schedule.slice(index + 1).find((candidate) => {
                            const nextState = itemState(candidate, now);
                            return nextState !== "completed" && nextState !== "cancelled";
                          });
                          setNextDecision(next ? { afterId: item.id, nextId: next.id } : null);
                          toast(next ? "Marked complete - choose what happens next" : "Marked complete");
                        }}>
                        <CheckCheck size={14} />Done
                      </button>
                      <button type="button" className="btn btn--sm btn--danger" disabled={liveControlsBlocked}
                        onClick={() => {
                          if (!window.confirm(`Cancel "${item.title.en}"? Visitors will see it struck out immediately.`)) return;
                          liveStore.setStatus(item.id, "cancelled", now);
                          toast("Cancelled");
                        }}>
                        <Ban size={14} />Cancel
                      </button>
                      {hasRunOverride && (
                        <button
                          type="button"
                          className="btn btn--sm"
                          disabled={liveControlsBlocked}
                          onClick={() => {
                            liveStore.setStatus(item.id, "scheduled", now);
                            setNextDecision(null);
                            toast("Returned to the published schedule");
                          }}
                        >
                          <RotateCcw size={14} />Back to scheduled
                        </button>
                      )}
                    </div>
                    {decisionItem && (
                      <div className="next-decision" role="status">
                        <div>
                          <strong>Next: {t(decisionItem.title, locale)}</strong>
                          <p className="small muted">
                            Scheduled for {formatTime(decisionItem.scheduledStart)}. Nothing has changed yet.
                          </p>
                        </div>
                        <div className="admin-row__ctrls">
                          <button type="button" className="btn btn--sm btn--jade" disabled={liveControlsBlocked} onClick={() => {
                            liveStore.setStatus(decisionItem.id, "live", clock.now());
                            setNextDecision(null);
                            toast(`${decisionItem.title.en} is live`);
                          }}>
                            <Play size={14} />Start now
                          </button>
                          <button type="button" className="btn btn--sm" disabled={liveControlsBlocked} onClick={() => {
                            setNextDecision(null);
                            toast("Next event kept at its scheduled time");
                          }}>
                            <Clock size={14} />Keep scheduled
                          </button>
                          <button type="button" className="btn btn--sm" disabled={liveControlsBlocked} onClick={() => {
                            liveStore.delay(decisionItem.id, 10, decisionItem);
                            setNextDecision(null);
                            toast("Next event pushed back 10 minutes");
                          }}>
                            <Clock size={14} />Delay +10
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="section">
            <h2>Announcements</h2>
            <p className="small muted">
              Publishing pushes a banner to the home screen. Emergency notices are red, full width
              and cannot be dismissed - use that severity only for a genuine emergency.
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
                        disabled={liveControlsBlocked}
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
                          disabled={liveControlsBlocked}
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
              <AnnouncementComposer now={now} disabled={liveControlsBlocked} toast={toast} />
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
