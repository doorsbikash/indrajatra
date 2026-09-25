import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Eye, FileCheck2, MapPin, Volume2 } from "lucide-react";
import { useApp } from "../app/AppContext";
import { NotFoundPage } from "./NotFound";
import { t } from "../lib/text";
import { localFestival } from "../lib/storage/localFestival";
import { trackEvent } from "../lib/analytics/track";

export function TrailPointPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, locale, toast, version } = useApp();
  void version;

  const point = data.trailPoints.find((p) => p.slug === slug);

  useEffect(() => {
    if (point) trackEvent("trail_point_view", { id: point.id });
  }, [point]);

  if (!point) return <NotFoundPage />;

  const location = data.locations.find((l) => l.id === point.locationId);
  const found = localFestival.isDiscovered(point.id);
  const related = (point.relatedTrailPointIds ?? [])
    .map((s) => data.trailPoints.find((p) => p.slug === s))
    .filter(Boolean);

  return (
    <main className="page">
      <section className="detail-hero">
        {point.heroMedia ? (
          <img src={point.heroMedia.src} alt={t(point.heroMedia.alt, locale)} />
        ) : (
          <span className="detail-hero__blank" aria-hidden />
        )}
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>

        <div>
          <p className="eyebrow eyebrow--light">Stop {point.number} of {data.trailPoints.length}</p>
          <h1>{t(point.title, locale)}</h1>
          {point.nativeName && (
            <p className="deva" style={{ color: "var(--marigold-400)", fontSize: "var(--step-2)", margin: "0 0 6px" }}>
              {point.nativeName}
            </p>
          )}
          {point.pronunciation && (
            <p className="small" style={{ color: "rgba(255,255,255,.66)", display: "flex", alignItems: "center", gap: 6 }}>
              <Volume2 size={14} />{point.pronunciation}
            </p>
          )}
        </div>
      </section>

      {found && (
        <p className="pill pill--live" style={{ marginBottom: "var(--s-4)" }}>
          <Check size={13} strokeWidth={3} />Stamp collected
        </p>
      )}

      <p className="lead" style={{ marginBottom: "var(--s-5)" }}>{t(point.teaser, locale)}</p>

      <div className="prose">
        {t(point.body, locale).split("\n\n").map((para, index) => <p key={index}>{para}</p>)}
      </div>

      {point.lookFor && (
        <div className="factbox" style={{ marginTop: "var(--s-5)" }}>
          <h3><Eye size={13} style={{ verticalAlign: -2, marginRight: 5 }} />What to look for</h3>
          <p>{t(point.lookFor, locale)}</p>
        </div>
      )}

      {point.whyItMatters && (
        <section className="section">
          <h2>Why it matters</h2>
          <div className="prose"><p>{t(point.whyItMatters, locale)}</p></div>
        </section>
      )}

      {location && (
        <section className="section">
          <Link className="card card-link row" to={`/map?at=${location.id}`} style={{ gap: 12, flexWrap: "nowrap" }}>
            <span className="icon-disc icon-disc--jade"><MapPin size={19} /></span>
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: "var(--step-0)" }}>{t(location.name, locale)}</strong>
              <span className="small muted">Show me on the site map</span>
            </span>
          </Link>
        </section>
      )}

      {!found && (
        <button
          type="button"
          className="btn btn--dark btn--block"
          style={{ marginTop: "var(--s-5)" }}
          onClick={() => {
            if (localFestival.discover(point.id, point.locationId)) {
              trackEvent("trail_point_discovered", { id: point.id });
              toast(`Stamp ${point.number} collected`);
            }
          }}
        >
          <Check size={17} />I'm standing here - collect the stamp
        </button>
      )}

      {related.length > 0 && (
        <section className="section">
          <h2>Next on the trail</h2>
          <div className="stack">
            {related.map((rel) => rel && (
              <Link key={rel.id} className="card card-link row" to={`/trail/${rel.slug}`} style={{ gap: 12, flexWrap: "nowrap" }}>
                <span className="icon-disc icon-disc--gold" style={{ fontWeight: 800 }}>{rel.number}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "var(--step-0)" }}>{t(rel.title, locale)}</strong>
                  <span className="small muted">{t(rel.teaser, locale)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {point.reviewStatus !== "approved" && (
        <div className="review-note" style={{ marginTop: "var(--s-6)" }}>
          <FileCheck2 size={14} />
          <span>
            This story is written and checked, and is awaiting final sign-off from the
            Newa Guthi Victoria cultural committee. Spotted something we should correct?
            Email <a href="mailto:info@newaguthi.org.au" style={{ textDecoration: "underline" }}>info@newaguthi.org.au</a>.
          </span>
        </div>
      )}
    </main>
  );
}
