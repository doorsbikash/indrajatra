import { Link } from "react-router-dom";
import { Compass, Home, MapPinned } from "lucide-react";

export function NotFoundPage() {
  return (
    <main className="page">
      <div className="scan-hit">
        <span className="icon-disc icon-disc--gold icon-disc--lg" aria-hidden>
          <Compass size={24} />
        </span>
        <div>
          <p className="eyebrow">Wrong turn</p>
          <h1 style={{ fontSize: "var(--step-4)" }}>We couldn't find that page</h1>
          <p className="lead" style={{ maxWidth: "34ch", margin: "0 auto" }}>
            It may have moved, or the link may be from a different year's festival.
          </p>
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn--primary" to="/"><Home size={17} />Home</Link>
          <Link className="btn" to="/map"><MapPinned size={17} />Site map</Link>
          <Link className="btn" to="/explore"><Compass size={17} />Trail</Link>
        </div>
      </div>
    </main>
  );
}
