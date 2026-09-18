import { CalendarPlus, MapPin, Navigation, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { t } from "../lib/text";
import { countdownLabel, formatTime, itemState } from "../lib/dates/schedule";
import { localFestival } from "../lib/storage/localFestival";
import { trackEvent } from "../lib/analytics/track";
import { downloadIcs } from "../lib/calendar/ics";
import { Pill } from "./ui";
import type { ScheduleItem } from "../lib/types";

export function EventCard({
  item,
  compact = false,
  showCountdown = false
}: {
  item: ScheduleItem;
  compact?: boolean;
  showCountdown?: boolean;
}) {
  const { data, locale, now, toast, version } = useApp();
  const location = data.locations.find((l) => l.id === item.locationId);
  const state = itemState(item, now);
  const saved = localFestival.isSaved(item.id);
  void version;

  const start = item.effectiveStart || item.scheduledStart;
  const moved = Boolean(item.effectiveStart && item.effectiveStart !== item.scheduledStart);

  return (
    <article className={`event-card event-card--${state}`}>
      <div className="event-card__top">
        <span className="event-card__time">
          {moved && <s>{formatTime(item.scheduledStart)}</s>}
          {formatTime(start)}
          {item.scheduledEnd && !moved && ` – ${formatTime(item.scheduledEnd)}`}
        </span>
        <StatusPill item={item} state={state} now={now} showCountdown={showCountdown} />
      </div>

      <h3>{t(item.title, locale)}</h3>

      {!compact && <p className="small muted" style={{ margin: 0 }}>{t(item.summary, locale)}</p>}

      <p className="event-card__where">
        <MapPin size={14} />
        {location ? t(location.name, locale) : "Location to be confirmed"}
      </p>

      {!compact && (
        <div className="event-card__actions">
          <button
            type="button"
            className="btn btn--sm save-btn"
            aria-pressed={saved}
            onClick={() => {
              const nowSaved = localFestival.toggleSaved(item.id);
              trackEvent("schedule_item_saved", { id: item.id });
              toast(nowSaved ? "Added to My Festival" : "Removed from My Festival");
            }}
          >
            <Star size={15} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              downloadIcs(item);
              trackEvent("calendar_downloaded", { id: item.id });
              toast("Calendar file downloaded");
            }}
          >
            <CalendarPlus size={15} />
            Calendar
          </button>
          <Link className="btn btn--sm" to={`/map?at=${item.locationId}`}>
            <Navigation size={15} />
            Find it
          </Link>
        </div>
      )}
    </article>
  );
}

function StatusPill({
  item,
  state,
  now,
  showCountdown
}: {
  item: ScheduleItem;
  state: string;
  now: Date;
  showCountdown: boolean;
}) {
  if (state === "live") return <Pill tone="live" dot>On now</Pill>;
  if (item.status === "cancelled") return <Pill tone="cancelled">Cancelled</Pill>;
  if (state === "completed") return <Pill tone="done">Finished</Pill>;
  if (item.status === "delayed") {
    return <Pill tone="delayed">Delayed {item.delayMinutes ?? 0} min</Pill>;
  }
  if (showCountdown) {
    return <Pill tone="next">in {countdownLabel(item.effectiveStart || item.scheduledStart, now)}</Pill>;
  }
  return null;
}
