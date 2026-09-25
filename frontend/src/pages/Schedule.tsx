import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Star } from "lucide-react";
import { useApp } from "../app/AppContext";
import { EventCard } from "../components/EventCard";
import { Empty, SectionHead } from "../components/ui";
import { scheduleCategories } from "../content/seed/data";
import { formatHour, itemState } from "../lib/dates/schedule";
import { localFestival } from "../lib/storage/localFestival";
import { downloadItinerary } from "../lib/calendar/ics";
import { trackEvent } from "../lib/analytics/track";

export function SchedulePage() {
  const { data, schedule, now, toast, version } = useApp();
  const [filter, setFilter] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  void version;

  useEffect(() => trackEvent("schedule_view"), []);

  const saved = localFestival.saved();

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: schedule.length };
    scheduleCategories.forEach(({ id }) => {
      if (id === "all") return;
      map[id] = schedule.filter((item) => item.categoryIds.includes(id)).length;
    });
    return map;
  }, [schedule]);

  const items = schedule
    .filter((item) => filter === "all" || item.categoryIds.includes(filter))
    .filter((item) => !savedOnly || saved.includes(item.id))
    .sort(
      (a, b) =>
        new Date(a.effectiveStart || a.scheduledStart).getTime() -
        new Date(b.effectiveStart || b.scheduledStart).getTime()
    );

  // Group by hour so the day reads as a timeline rather than a flat list.
  const groups: { hour: string; items: typeof items }[] = [];
  items.forEach((item) => {
    const hour = formatHour(item.effectiveStart || item.scheduledStart);
    const last = groups[groups.length - 1];
    if (last && last.hour === hour) last.items.push(item);
    else groups.push({ hour, items: [item] });
  });

  const liveIndex = items.findIndex((item) => itemState(item, now) === "live");

  return (
    <main className="page">
      <p className="eyebrow">Saturday 26 September · 9am–4:10pm</p>
      <h1>Programme</h1>
      <p className="lead">
        {liveIndex >= 0
          ? "Something is on right now. Times update live if the organisers move an item."
          : `${schedule.length} items across the day. Save what you want to see and it lands in My Festival.`}
      </p>

      <div className="chips" role="group" aria-label="Filter the programme">
        {scheduleCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="chip"
            aria-pressed={filter === cat.id}
            onClick={() => setFilter(cat.id)}
          >
            {cat.label}
            <span className="chip__count">{counts[cat.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="row row--between" style={{ marginBottom: "var(--s-4)" }}>
        <button
          type="button"
          className="chip"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly((v) => !v)}
        >
          <Star size={14} />
          Saved only
          <span className="chip__count">{saved.length}</span>
        </button>
        <button
          type="button"
          className="btn btn--sm btn--quiet"
          onClick={() => {
            const list = saved.length ? schedule.filter((i) => saved.includes(i.id)) : schedule;
            downloadItinerary(list, data.event);
            toast(saved.length ? "Your saved items downloaded" : "Whole programme downloaded");
          }}
        >
          <Download size={15} />
          Add to calendar
        </button>
      </div>

      {items.length === 0 ? (
        <Empty icon={<CalendarDays size={22} />} title="Nothing here yet">
          {savedOnly
            ? "You haven't saved anything in this category. Tap Save on any item to build your day."
            : "No items in this category. Try another filter."}
        </Empty>
      ) : (
        <div className="timeline">
          {groups.map((group) => (
            <div key={group.hour}>
              <div className="timeline__hour"><span>{group.hour}</span></div>
              <div className="rail stack">
                {group.items.map((item) => {
                  const state = itemState(item, now);
                  const mark =
                    state === "live" ? " rail__stop--live"
                    : state === "completed" ? " rail__stop--done"
                    : "";
                  return (
                    <div className={`rail__stop${mark}`} key={item.id}>
                      <EventCard item={item} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="divider-motif" aria-hidden />

      <SectionHead title="A note on timings" />
      <div className="card card--sunk">
        <p className="small muted" style={{ margin: 0 }}>
          Processions move at the speed of the crowd. If an item starts late, the organisers
          update it from the stage and this page changes with it - a struck-through time means
          it has moved.
        </p>
      </div>
    </main>
  );
}
