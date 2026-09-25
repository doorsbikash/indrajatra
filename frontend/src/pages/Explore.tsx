import { Link } from "react-router-dom";
import { Check, QrCode } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Passport } from "../components/Passport";
import { t } from "../lib/text";
import { localFestival } from "../lib/storage/localFestival";

export function ExplorePage() {
  const { data, locale, version } = useApp();
  void version;
  const discovered = localFestival.discovered();

  return (
    <main className="page">
      <p className="eyebrow">Yenya Digital Cultural Trail</p>
      <h1>Twelve stops</h1>
      <p className="lead">
        Every mask, chariot and drum on this field carries a story. Find the numbered sign,
        scan the code, and read the two minutes behind it. Collect all twelve for your badge.
      </p>

      <div style={{ marginTop: "var(--s-5)" }}>
        <Passport />
      </div>

      <div className="card card--sunk row" style={{ marginTop: "var(--s-4)", gap: 12, flexWrap: "nowrap" }}>
        <span className="icon-disc icon-disc--dark"><QrCode size={19} /></span>
        <p className="small muted" style={{ margin: 0 }}>
          No QR scanner? Open your phone camera and point it at the sign - it will offer to open
          the link. You can also read any stop here without scanning; the stamp is for finding it
          in person.
        </p>
      </div>

      <section className="section">
        <div className="trail-grid">
          {data.trailPoints.map((point) => {
            const found = discovered.includes(point.id);
            return (
              <Link
                key={point.id}
                to={`/trail/${point.slug}`}
                className={`trail-card${found ? "" : " trail-card--locked"}`}
              >
                {point.heroMedia ? (
                  <img src={point.heroMedia.src} alt="" loading="lazy" />
                ) : (
                  <span className="trail-card__blank" aria-hidden />
                )}
                <span className="trail-card__num">{point.number}</span>
                {found && <span className="trail-card__found"><Check size={15} strokeWidth={3} /></span>}
                <span className="trail-card__body">
                  <h3>{t(point.title, locale)}</h3>
                  <p>{found ? "Found" : t(point.teaser, locale).slice(0, 52) + "…"}</p>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
