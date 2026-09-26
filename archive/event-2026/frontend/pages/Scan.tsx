import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Compass, MapPinned, ScanLine } from "lucide-react";
import { useApp } from "../app/AppContext";
import { t } from "../lib/text";
import { localFestival } from "../lib/storage/localFestival";
import { trackEvent } from "../lib/analytics/track";

export function ScanPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { data, locale } = useApp();
  const [isNew, setIsNew] = useState(false);
  const handled = useRef(false);

  const point = data.trailPoints.find((p) =>
    p.qrCodes.some((qr) => qr.toLowerCase() === (code ?? "").toLowerCase())
  );

  useEffect(() => {
    if (!point || handled.current) return;
    handled.current = true;
    setIsNew(localFestival.discover(point.id, point.locationId));
    trackEvent("qr_scan", { code: code ?? "" });
    const timer = window.setTimeout(() => navigate(`/trail/${point.slug}`, { replace: true }), 1600);
    return () => window.clearTimeout(timer);
  }, [point, code, navigate]);

  if (!point) {
    return (
      <main className="page">
        <div className="scan-hit">
          <span className="icon-disc icon-disc--gold icon-disc--lg"><ScanLine size={24} /></span>
          <div>
            <h1 style={{ fontSize: "var(--step-4)" }}>That code didn't match a stop</h1>
            <p className="lead" style={{ maxWidth: "36ch", margin: "0 auto" }}>
              The sticker may be damaged, or it may belong to a different event. No problem -
              you can reach every stop from the trail.
            </p>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--primary" to="/explore"><Compass size={17} />Open the trail</Link>
            <Link className="btn" to="/map"><MapPinned size={17} />Site map</Link>
          </div>
          <p className="tiny muted">Code scanned: <code>{code}</code></p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="scan-hit">
        <span className="scan-hit__disc"><Check size={44} strokeWidth={3} /></span>
        <div>
          <p className="eyebrow">{isNew ? `Stamp ${point.number} collected` : "You've been here before"}</p>
          <h1 style={{ fontSize: "var(--step-4)" }}>{t(point.title, locale)}</h1>
          <p className="muted small">Opening the story…</p>
        </div>
        <Link className="btn btn--primary" to={`/trail/${point.slug}`} replace>Read it now</Link>
      </div>
    </main>
  );
}
