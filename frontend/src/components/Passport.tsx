import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useApp } from "../app/AppContext";
import { localFestival } from "../lib/storage/localFestival";

export function Passport({ compact = false }: { compact?: boolean }) {
  const { data, version } = useApp();
  void version;
  const discovered = localFestival.discovered();
  const total = data.trailPoints.length;
  const found = discovered.length;
  const pct = total ? Math.round((found / total) * 100) : 0;
  const complete = found >= total && total > 0;

  return (
    <section className="passport" aria-label="Cultural passport progress">
      <p className="eyebrow eyebrow--light">Yenya Cultural Passport</p>
      <div className="row row--between" style={{ alignItems: "flex-end", marginBottom: 12 }}>
        <span className="passport__count">
          {found}<span>of {total} stops</span>
        </span>
        {complete && <span className="pill" style={{ background: "var(--marigold-400)", color: "var(--oxblood-900)" }}>Complete</span>}
      </div>

      <div className="passport__bar" role="progressbar" aria-valuenow={found} aria-valuemin={0} aria-valuemax={total}>
        <div className="passport__fill" style={{ width: `${pct}%` }} />
      </div>

      <p className="passport__sub" style={{ marginTop: 12, marginBottom: compact ? 0 : 16 }}>
        {complete
          ? "You found every stop on the trail. Your badge is waiting in My Festival."
          : found === 0
            ? "Scan the QR code at any numbered marker around the site to collect your first stamp."
            : `${total - found} to go. Look for the numbered signs near the chariots, the stage and the display line.`}
      </p>

      {!compact && (
        <>
          <ol className="stamp-grid" aria-label="Trail stamps">
            {data.trailPoints.map((point) => {
              const on = discovered.includes(point.id);
              return (
                <li key={point.id} className={`stamp${on ? " stamp--on" : ""}`}
                    aria-label={`${point.number}. ${point.title.en} — ${on ? "found" : "not yet found"}`}>
                  {on ? <Check size={13} strokeWidth={3.5} /> : point.number}
                </li>
              );
            })}
          </ol>
          <Link className="btn btn--gold btn--block" to="/explore" style={{ marginTop: 18 }}>
            {found === 0 ? "See the trail" : complete ? "Revisit the trail" : "Find the next stop"}
          </Link>
        </>
      )}
    </section>
  );
}
