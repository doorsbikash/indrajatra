import { Link } from "react-router-dom";
import { Drum, ExternalLink, HandHeart, Music2, Sparkles, Users } from "lucide-react";
import { useApp } from "../app/AppContext";
import { localFestival } from "../lib/storage/localFestival";
import { trackEvent } from "../lib/analytics/track";

const CLASSES = [
  { icon: Drum, name: "Dhimay", detail: "The two-headed processional drum. Children and adults, all levels." },
  { icon: Music2, name: "Bhusya Baja", detail: "Hand cymbals, played alongside the dhimay." },
  { icon: Music2, name: "Bansuri", detail: "Bamboo flute. Start from nothing — no music background needed." },
  { icon: Users, name: "Newari dance", detail: "Traditional Newa dances, taught for performance at community events." }
];

export function MembershipPage() {
  const { data, profile, requireSignIn, version } = useApp();
  void version;
  const discovered = localFestival.discovered().length;
  const total = data.trailPoints.length;
  const complete = discovered >= total && total > 0;

  return (
    <main className="page">
      <p className="eyebrow">Newa Guthi Victoria</p>
      <h1>Join the Guthi</h1>
      <p className="lead">
        A guthi is how Newa festivals have been kept alive for centuries — a group of people
        who take on a duty and keep turning up. Today's festival exists because enough people
        in Melbourne said yes.
      </p>

      <section className="section">
        <div className="passport">
          <p className="eyebrow eyebrow--light">Festival offer</p>
          <h2 style={{ fontSize: "var(--step-4)" }}>
            {complete ? "Your trail reward is ready" : "Finish the trail, unlock your offer"}
          </h2>
          <p className="passport__sub">
            {complete
              ? `All ${total} stops found. Show this screen at the Newa Guthi Victoria desk at stall 1 to claim your festival membership offer.`
              : `${discovered} of ${total} stops found. Complete the Yenya Cultural Trail today and your festival membership offer unlocks here.`}
          </p>
          {complete ? (
            <button
              type="button"
              className="btn btn--gold btn--block"
              onClick={() => {
                if (!requireSignIn("Claim your festival membership offer")) return;
                trackEvent("membership_clicked");
                window.open(data.event.membershipUrl, "_blank", "noopener");
              }}
            >
              <Sparkles size={17} />Claim my offer
            </button>
          ) : (
            <Link className="btn btn--light btn--block" to="/explore">Continue the trail</Link>
          )}
        </div>
      </section>

      <section className="section">
        <h2>Weekly cultural classes</h2>
        <p className="small muted">
          Run in Melbourne, open to everyone, whether or not you have a Newa background.
          Come and try one at the taster session at 3:05pm today.
        </p>
        <div className="stack" style={{ marginTop: "var(--s-4)" }}>
          {CLASSES.map(({ icon: Icon, name, detail }) => (
            <div className="card row" key={name} style={{ gap: 12, flexWrap: "nowrap" }}>
              <span className="icon-disc icon-disc--gold"><Icon size={19} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "var(--step-0)" }}>{name}</strong>
                <span className="small muted">{detail}</span>
              </span>
            </div>
          ))}
        </div>
        <a
          className="btn btn--block"
          style={{ marginTop: 12 }}
          href="mailto:info@newaguthi.org.au?subject=Weekly%20classes"
          onClick={() => trackEvent("class_clicked")}
        >
          Ask about classes
        </a>
      </section>

      <section className="section">
        <h2>What membership supports</h2>
        <div className="card card--sunk">
          <ul className="small muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
            <li>Chariots, costumes, masks and instruments — including the new Ganesh Rath built for 2026</li>
            <li>Weekly Dhimay, Bhusya Baja, Bansuri and dance classes for children and adults</li>
            <li>Four community festivals a year: World Newah Day, Biska Jatra, Indra Jatra and Mha Puja</li>
            <li>Keeping every one of them free to attend</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="card card--pad-lg">
          <span className="icon-disc icon-disc--dark" style={{ marginBottom: 12 }}><HandHeart size={19} /></span>
          <h3>Volunteer for next year</h3>
          <p className="small muted">
            Marshals, stage crew, setup and pack-down, rope teams, kitchen, first aid support.
            Nothing here happens without volunteers.
          </p>
          <div className="row">
            <Link className="btn btn--sm btn--primary" to="/volunteer">
              Put my name down
            </Link>
            {data.event.organiserUrl && (
              <a className="btn btn--sm" href={data.event.organiserUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />newaguthi.org.au
              </a>
            )}
          </div>
        </div>
      </section>

      {!profile && (
        <p className="tiny muted" style={{ marginTop: "var(--s-5)", textAlign: "center" }}>
          Creating a free festival pass keeps your trail progress and offer linked to your email.
        </p>
      )}
    </main>
  );
}
