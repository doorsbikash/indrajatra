import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Accessibility, ChevronDown, CircleParking, CloudSun, Droplets, HeartPulse,
  MapPin, Phone, Search, ShieldAlert, Toilet, TreePine, Utensils
} from "lucide-react";
import { useApp } from "../app/AppContext";
import { t } from "../lib/text";
import type { InfoCard } from "../lib/types";

const ICONS = {
  firstaid: HeartPulse,
  lost: Search,
  access: Accessibility,
  parking: CircleParking,
  toilet: Toilet,
  water: Droplets,
  weather: CloudSun,
  quiet: TreePine,
  police: ShieldAlert,
  food: Utensils
} as const;

export function InfoPage() {
  const { data, locale } = useApp();
  const emergency = data.infoCards.find((c) => c.id === "emergency");
  const rest = data.infoCards.filter((c) => c.id !== "emergency");

  return (
    <main className="page">
      <p className="eyebrow">Practical information</p>
      <h1>Help &amp; safety</h1>
      <p className="lead">
        Everything you might need on the day, in one place. Any volunteer in a hi-vis vest can
        point you to the rest.
      </p>

      {emergency && (
        <div className="card card--emergency">
          <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
            <span className="icon-disc icon-disc--onDark">
              <ShieldAlert size={20} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ color: "#fff", margin: 0 }}>{t(emergency.title, locale)}</h3>
              <p className="small" style={{ color: "rgba(255,255,255,.85)", margin: "4px 0 0" }}>
                {t(emergency.body, locale)}
              </p>
            </div>
          </div>
          <a className="btn btn--light btn--block" href="tel:000" style={{ marginTop: 14 }}>
            <Phone size={17} />Call 000
          </a>
        </div>
      )}

      <section className="section">
        <div className="stack">
          {rest.map((card) => <InfoRow key={card.id} card={card} />)}
        </div>
      </section>

      <div className="divider-motif" aria-hidden />

      <section>
        <h2>Common questions</h2>
        <div className="stack" style={{ marginTop: "var(--s-3)" }}>
          {data.faqs.map((faq) => (
            <details key={faq.id} className="card">
              <summary style={{ cursor: "pointer", fontWeight: 700, listStyle: "none", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                {t(faq.q, locale)}
                <ChevronDown size={17} style={{ flex: "0 0 auto", color: "var(--faint)" }} />
              </summary>
              <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>{t(faq.a, locale)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Contact the organisers</h2>
        <div className="card">
          <dl className="def-list">
            <div><dt>Organiser</dt><dd>{data.event.organiser}</dd></div>
            <div><dt>Email</dt><dd><a href={`mailto:${data.event.contactEmail}`} style={{ textDecoration: "underline" }}>{data.event.contactEmail}</a></dd></div>
            <div><dt>Phone</dt><dd><a href={`tel:${data.event.contactPhone}`} style={{ textDecoration: "underline" }}>0402 556 696</a></dd></div>
            <div><dt>On the day</dt><dd>Media Station</dd></div>
          </dl>
        </div>
      </section>
    </main>
  );
}

function InfoRow({ card }: { card: InfoCard }) {
  const { locale } = useApp();
  const [open, setOpen] = useState(false);
  const Icon = ICONS[card.icon];
  const tone = card.icon === "firstaid" || card.icon === "access" ? "jade" : card.icon === "parking" ? "dark" : "gold";

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="row"
        style={{ gap: 12, width: "100%", background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", flexWrap: "nowrap" }}
      >
        <span className={`icon-disc icon-disc--${tone}`}><Icon size={19} /></span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--step-0)" }}>{t(card.title, locale)}</span>
        <ChevronDown size={18} style={{ flex: "0 0 auto", color: "var(--faint)", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p className="small muted">{t(card.body, locale)}</p>
          <div className="row">
            {card.locationId && (
              <Link className="btn btn--sm" to={`/map?at=${card.locationId}`}>
                <MapPin size={14} />Show on map
              </Link>
            )}
            {card.action && (
              <a className="btn btn--sm btn--quiet" href={card.action.href} target={card.action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {card.action.label}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
