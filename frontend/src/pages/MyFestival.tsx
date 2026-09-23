import { Link } from "react-router-dom";
import { Award, Download, LogOut, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useApp } from "../app/AppContext";
import { EventCard } from "../components/EventCard";
import { Passport } from "../components/Passport";
import { Empty } from "../components/ui";
import { localFestival } from "../lib/storage/localFestival";
import { downloadItinerary } from "../lib/calendar/ics";

export function MyFestivalPage() {
  const { data, schedule, profile, signOut, toast, requireSignIn, version } = useApp();
  void version;

  const savedIds = localFestival.saved();
  const saved = schedule.filter((item) => savedIds.includes(item.id));
  const discovered = localFestival.discovered();
  const complete = discovered.length >= data.trailPoints.length && data.trailPoints.length > 0;

  return (
    <main className="page">
      <p className="eyebrow">Your festival</p>

      {profile ? (
        <div className="row" style={{ gap: 14, flexWrap: "nowrap", marginBottom: "var(--s-5)" }}>
          <span className="avatar avatar--lg" aria-hidden>
            {profile.firstName[0]}{profile.lastName[0]}
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "var(--step-4)" }}>{profile.firstName} {profile.lastName}</h1>
            <p className="small muted" style={{ margin: 0, wordBreak: "break-word" }}>{profile.email}</p>
          </div>
        </div>
      ) : (
        <>
          <h1>Your day, saved</h1>
          <div className="card card--pad-lg" style={{ marginBottom: "var(--s-5)" }}>
            <p className="small muted">
            Everything below is stored on this phone and works without an account. Create a
              free festival pass to sign in securely and claim your member offer at the end of
              the trail. Saved events and stamps stay on this device during staging.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--block"
              style={{ marginTop: 12 }}
              onClick={() => requireSignIn("Create your free festival pass")}
            >
              Create a free pass
            </button>
          </div>
        </>
      )}

      <Passport />

      {complete && (
        <section className="section">
          <div className="certificate">
            <Award size={38} style={{ margin: "0 auto var(--s-3)", color: "var(--marigold-400)" }} />
            <p className="eyebrow eyebrow--light">Badge earned</p>
            <h2>Yenya Explorer 2026</h2>
            <p>
              You found all {data.trailPoints.length} stops on the Yenya Digital Cultural Trail.
              Show this at the Newa Guthi Victoria desk at stall 1.
            </p>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2>Saved for later</h2>
          {saved.length > 0 && (
            <button
              type="button"
              className="section__link"
              style={{ background: "none", border: 0, cursor: "pointer" }}
              onClick={() => {
                downloadItinerary(saved, data.event);
                toast("Your plan downloaded");
              }}
            >
              <Download size={14} />Calendar
            </button>
          )}
        </div>

        {saved.length ? (
          <div className="stack">
            {saved.map((item) => <EventCard key={item.id} item={item} />)}
          </div>
        ) : (
          <Empty icon={<Star size={22} />} title="Nothing saved yet">
            Tap Save on anything in the programme and it appears here, ready to add to your
            phone's calendar.
          </Empty>
        )}
        {!saved.length && (
          <Link className="btn btn--block" to="/schedule" style={{ marginTop: 12 }}>
            Browse the programme
          </Link>
        )}
      </section>

      <section className="section">
        <h2>Your privacy</h2>
        <div className="card">
          <p className="small" style={{ display: "flex", gap: 10 }}>
            <ShieldCheck size={17} style={{ flex: "0 0 auto", color: "var(--clay-600)", marginTop: 2 }} />
            <span className="muted">
              Your saved items and trail stamps live in this browser only.
              They are never uploaded and never shared. Clearing them below removes them for good.
            </span>
          </p>
          <dl className="def-list" style={{ margin: "var(--s-3) 0" }}>
            <div><dt>Saved programme items</dt><dd>{savedIds.length}</dd></div>
            <div><dt>Trail stamps</dt><dd>{discovered.length}</dd></div>
            <div><dt>Festival pass</dt><dd>{profile ? "Created" : "Not created"}</dd></div>
          </dl>
          <div className="row">
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => {
                if (!window.confirm("Clear your saved items and trail stamps from this device? This cannot be undone.")) return;
                localFestival.reset();
                toast("Everything cleared from this device");
              }}
            >
              <Trash2 size={15} />Clear my data
            </button>
            {profile && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={async () => {
                  await signOut();
                  toast("Signed out");
                }}
              >
                <LogOut size={15} />Sign out
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <Link className="btn btn--gold btn--block" to="/membership">
          Your member offer &amp; weekly classes
        </Link>
      </section>
    </main>
  );
}
