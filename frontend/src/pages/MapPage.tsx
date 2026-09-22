import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Accessibility, ExternalLink, Navigation, X } from "lucide-react";
import { useApp } from "../app/AppContext";
import { t } from "../lib/text";
import { trackEvent } from "../lib/analytics/track";
import type { LocationType } from "../lib/types";

const GROUPS: { id: string; label: string; types: LocationType[] }[] = [
  { id: "all", label: "Everything", types: [] },
  { id: "need", label: "Toilets & help", types: ["amenity"] },
  { id: "food", label: "Food & stalls", types: ["food", "market"] },
  { id: "culture", label: "Stage & culture", types: ["stage", "culture", "community"] },
  { id: "arrive", label: "Parking & entry", types: ["parking", "entry"] }
];

const markerTone = (type: LocationType) =>
  type === "amenity" ? "marker--amenity" : type === "parking" ? "marker--parking" : "";

export function MapPage() {
  const { data, locale } = useApp();
  const [params, setParams] = useSearchParams();
  const [group, setGroup] = useState("all");

  const selectedId = params.get("at");
  const selected = data.locations.find((l) => l.id === selectedId);

  useEffect(() => trackEvent("map_view"), []);

  const visible = useMemo(() => {
    const config = GROUPS.find((g) => g.id === group);
    if (!config || !config.types.length) return data.locations;
    return data.locations.filter((l) => config.types.includes(l.type));
  }, [group, data.locations]);

  const select = (id: string | null) => {
    if (id) {
      setParams({ at: id }, { replace: true });
      trackEvent("map_marker_selected", { id });
    } else {
      setParams({}, { replace: true });
    }
  };

  const route = selected
    ? data.routes.find((r) => r.toLocationId === selected.id && r.fromLocationId === "guest-entry")
    : undefined;
  const selectedStalls = selected?.id === "market-row"
    ? data.listings
        .filter((listing) => listing.published && listing.locationId === "market-row")
        .map((listing) => {
          const stallTag = listing.categories.find((category) => /^Stall \d+$/.test(category));
          return { listing, number: stallTag ? Number(stallTag.slice(6)) : null };
        })
        .filter((row): row is { listing: (typeof data.listings)[number]; number: number } => row.number !== null)
        .sort((a, b) => a.number - b.number)
    : [];

  return (
    <main className="page">
      <p className="eyebrow">Site map</p>
      <h1>Find it on the field</h1>
      <p className="lead">
        The whole site is flat and walkable in about four minutes end to end. Tap a number for
        details, or use the list below the map.
      </p>

      <div className="chips" role="group" aria-label="Filter map markers">
        {GROUPS.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label}
          </button>
        ))}
      </div>

      <div className="map-wrap">
        <div className="map-canvas">
          <img src="/map/indra-jatra-2026-planned-site-map.jpeg" alt="Planned site layout for the festival at ANMC, Diggers Rest" />
          {visible.map((location, index) => (
            <button
              key={location.id}
              type="button"
              className={`marker ${markerTone(location.type)}${selectedId === location.id ? " marker--active" : ""}`}
              style={{ left: `${location.mapX}%`, top: `${location.mapY}%` }}
              onClick={() => select(selectedId === location.id ? null : location.id)}
              aria-label={t(location.name, locale)}
              aria-pressed={selectedId === location.id}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="legend">
        <span><i style={{ color: "var(--brand)" }} />Stage, culture &amp; food</span>
        <span><i style={{ color: "var(--clay-600)" }} />Toilets, first aid &amp; help</span>
        <span><i style={{ color: "var(--faint)" }} />Parking &amp; entry</span>
      </div>

      {selected && (
        <div className="map-sheet">
          <div className="row row--between" style={{ flexWrap: "nowrap", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>{selected.type}</p>
              <h2 style={{ margin: 0, fontSize: "var(--step-2)" }}>{t(selected.name, locale)}</h2>
            </div>
            <button type="button" className="btn btn--icon btn--sm" onClick={() => select(null)} aria-label="Close details">
              <X size={16} />
            </button>
          </div>
          {selected.description && <p className="small muted" style={{ marginTop: 10 }}>{t(selected.description, locale)}</p>}
          {route && (
            <p className="small" style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Navigation size={15} style={{ flex: "0 0 auto", color: "var(--brand)", marginTop: 2 }} />
              <span>{t(route.steps[0], locale)}</span>
            </p>
          )}
          {selected.accessibilityNotes && (
            <p className="small" style={{ display: "flex", gap: 8, marginTop: 8, color: "var(--clay-700)" }}>
              <Accessibility size={15} style={{ flex: "0 0 auto", marginTop: 2 }} />
              <span>{t(selected.accessibilityNotes, locale)}</span>
            </p>
          )}
          {selectedStalls.length > 0 && (
            <div className="map-stall-roster" aria-label="Confirmed market stall assignments">
              {selectedStalls.map(({ listing, number }) => (
                <span key={listing.id}><strong>{number}</strong>{listing.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <section className="section">
        <h2>Every location</h2>
        <p className="small muted">Numbers match the map above.</p>
        <ul className="stack" style={{ listStyle: "none", padding: 0, marginTop: "var(--s-3)" }}>
          {visible.map((location, index) => (
            <li key={location.id}>
              <button
                type="button"
                className="card card-link row"
                style={{ gap: 12, width: "100%", textAlign: "left", flexWrap: "nowrap", cursor: "pointer" }}
                onClick={() => select(location.id)}
              >
                <span className={`icon-disc${location.type === "amenity" ? " icon-disc--jade" : location.type === "parking" ? " icon-disc--dark" : ""}`}
                      style={{ fontWeight: 800, width: 36, height: 36, flex: "0 0 36px", fontSize: "var(--step--1)" }}>
                  {index + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: "var(--step-0)" }}>{t(location.name, locale)}</strong>
                  {location.description && (
                    <span className="small muted" style={{ display: "block" }}>{t(location.description, locale)}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="card card--sunk">
          <h3>Getting here</h3>
          <p className="small muted">{data.event.venueName}, {data.event.venueAddress}</p>
          <a className="btn btn--sm" href={data.event.venueMapsUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />Open in Maps
          </a>
        </div>
        <Link className="btn btn--quiet btn--block" to="/info" style={{ marginTop: 10 }}>
          Accessibility, first aid and help →
        </Link>
      </section>
    </main>
  );
}
