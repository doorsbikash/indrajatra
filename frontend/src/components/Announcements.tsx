import { AlertTriangle, Info, Megaphone, TriangleAlert, X } from "lucide-react";
import { useApp } from "../app/AppContext";
import { t } from "../lib/text";
import { localFestival } from "../lib/storage/localFestival";
import type { Announcement } from "../lib/types";

const ICONS = {
  info: Info,
  update: Megaphone,
  important: TriangleAlert,
  emergency: AlertTriangle
} as const;

export function Announcements({ limit = 2 }: { limit?: number }) {
  const { announcements, now, locale, version } = useApp();
  void version;
  const dismissed = localFestival.dismissed();

  const active = announcements
    .filter((a) => a.published)
    .filter((a) => new Date(a.startsAt) <= now)
    .filter((a) => !a.endsAt || new Date(a.endsAt) > now)
    .filter((a) => a.severity === "emergency" || !dismissed.includes(a.id))
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, limit);

  if (!active.length) return null;

  return (
    <div className="stack" aria-live="polite">
      {active.map((a) => {
        const Icon = ICONS[a.severity];
        return (
          <div key={a.id} className={`announce announce--${a.severity}`} role={a.severity === "emergency" ? "alert" : undefined}>
            <Icon size={19} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3>{t(a.title, locale)}</h3>
              <p>{t(a.message, locale)}</p>
            </div>
            {a.severity !== "emergency" && (
              <button
                type="button"
                onClick={() => localFestival.dismiss(a.id)}
                aria-label={`Dismiss: ${t(a.title, locale)}`}
                style={{ background: "none", border: 0, padding: 4, cursor: "pointer", color: "inherit", opacity: .5 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const weight = (a: Announcement) =>
  ({ emergency: 3, important: 2, update: 1, info: 0 })[a.severity];
