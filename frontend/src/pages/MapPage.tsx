import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Accessibility, ExternalLink, Navigation, X } from "lucide-react";
import { useApp } from "../app/AppContext";
import { t } from "../lib/text";
import { trackEvent } from "../lib/analytics/track";
import type { Listing, LocationType } from "../lib/types";

const GROUPS: { id: string; label: string; types: LocationType[] }[] = [
  { id: "all", label: "Everything", types: [] },
  { id: "need", label: "Toilets & help", types: ["amenity"] },
  { id: "food", label: "Food & stalls", types: ["food", "market"] },
  { id: "culture", label: "Stage & culture", types: ["stage", "culture", "community"] },
  { id: "arrive", label: "Parking & entry", types: ["parking", "entry"] }
];

const markerTone = (type: LocationType) =>
  type === "amenity" ? "marker--amenity" : type === "parking" ? "marker--parking" : "";

type StallRow = { number: number; listing?: Listing };

const stallNumber = (listing: Listing) => {
  const tag = listing.categories.find((category) => /^Stall \d+$/.test(category));
  return tag ? Number(tag.slice(6)) : null;
};

const truckNumber = (listing: Listing) => {
  const tag = listing.categories.find((category) => /^Truck \d+$/.test(category));
  return tag ? Number(tag.slice(6)) : null;
};

/* Geometry measured off the 2026 site map artwork, in its own pixels, so the
   overlay is vector and stays sharp at any size. Stall 1 sits at the RIGHT
   end of the row; the numbers count down to 20 on the left. */
const MAP_W = 1240;
const MAP_H = 1646;
const STRIP = { x: 222, y: 208, w: 624, h: 35 };
const STALL_W = STRIP.w / 20;
const TRUCKS = { x: 112, y: 259, w: 83, h: 380 };
const TRUCK_H = TRUCKS.h / 4;

const stallBox = (n: number) => ({ x: STRIP.x + STRIP.w - n * STALL_W, y: STRIP.y, w: STALL_W, h: STRIP.h });
const truckBox = (n: number) => ({ x: TRUCKS.x, y: TRUCKS.y + (n - 1) * TRUCK_H, w: TRUCKS.w, h: TRUCK_H });
const px = (v: number, total: number) => `${(v / total) * 100}%`;
const toneOf = (listing?: Listing) =>
  !listing ? "is-empty" : listing.listingType === "food" ? "is-food" : "is-stall";

export function MapPage() {
  const { data, locale } = useApp();
  const [params, setParams] = useSearchParams();
  const [group, setGroup] = useState("all");

  const selectedId = params.get("at");
  const selected = data.locations.find((l) => l.id === selectedId);
  const selectedStallNumber = Number(params.get("stall")) || null;

  useEffect(() => trackEvent("map_view"), []);

  const visible = useMemo(() => {
    const config = GROUPS.find((g) => g.id === group);
    if (!config || !config.types.length) return data.locations;
    return data.locations.filter((l) => config.types.includes(l.type));
  }, [group, data.locations]);

  const locationNumbers = useMemo(
    () => new Map(data.locations.map((location, index) => [location.id, index + 1])),
    [data.locations]
  );

  const stalls = useMemo<StallRow[]>(() => {
    const byNumber = new Map<number, Listing>();
    data.listings
      .filter((listing) => listing.published && listing.locationId === "market-row")
      .forEach((listing) => {
        const number = stallNumber(listing);
        if (number) byNumber.set(number, listing);
      });
    return Array.from({ length: 20 }, (_, index) => ({ number: index + 1, listing: byNumber.get(index + 1) }));
  }, [data.listings]);

  const trucks = useMemo<StallRow[]>(() => {
    const byNumber = new Map<number, Listing>();
    data.listings
      .filter((listing) => listing.published && listing.locationId === "food-trucks")
      .forEach((listing) => {
        const number = truckNumber(listing);
        if (number) byNumber.set(number, listing);
      });
    return Array.from({ length: 4 }, (_, index) => ({ number: index + 1, listing: byNumber.get(index + 1) }));
  }, [data.listings]);

  const selectedTruckNumber = Number(params.get("truck")) || null;
  const selectedTruck = selectedTruckNumber
    ? trucks.find((truck) => truck.number === selectedTruckNumber)
    : undefined;

  const selectedStall = selectedStallNumber
    ? stalls.find((stall) => stall.number === selectedStallNumber)
    : undefined;
  const showStalls = group === "all" || group === "food";

  const select = (id: string | null) => {
    if (id) {
      setParams({ at: id }, { replace: true });
      trackEvent("map_marker_selected", { id });
    } else {
      setParams({}, { replace: true });
    }
  };

  const selectStall = (number: number | null) => {
    if (number) {
      setParams({ stall: String(number) }, { replace: true });
      trackEvent("map_stall_selected", { number });
    } else {
      setParams({}, { replace: true });
    }
  };

  const selectTruck = (number: number | null) => {
    if (number) {
      setParams({ truck: String(number) }, { replace: true });
      trackEvent("map_truck_selected", { number });
    } else {
      setParams({}, { replace: true });
    }
  };

  const spot = selectedStall ?? selectedTruck;
  const spotLabel = selectedStall
    ? `Market stall ${selectedStall.number}`
    : selectedTruck ? `Food truck ${selectedTruck.number}` : "";
  const clearSpot = () => (selectedStall ? selectStall(null) : selectTruck(null));

  const route = selected
    ? data.routes.find((r) => r.toLocationId === selected.id && r.fromLocationId === "guest-entry")
    : undefined;
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
          {visible
            .filter((location) => location.id !== "market-row")
            // the stall row and the truck bays draw their own numbered chips
            .filter((location) => !(showStalls && location.id === "food-trucks"))
            .map((location) => (
            <button
              key={location.id}
              type="button"
              className={`marker ${markerTone(location.type)}${selectedId === location.id ? " marker--active" : ""}`}
              style={{ left: `${location.mapX}%`, top: `${location.mapY}%` }}
              onClick={() => select(selectedId === location.id ? null : location.id)}
              aria-label={t(location.name, locale)}
              aria-pressed={selectedId === location.id}
            >
              {locationNumbers.get(location.id)}
            </button>
          ))}
          {showStalls && (
            <svg className="map-mask" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true" focusable="false">
              {stalls.map((stall) => {
                const b = stallBox(stall.number);
                const on = selectedStallNumber === stall.number;
                return (
                  <g key={`m-stall-${stall.number}`} className={`mask-cell ${toneOf(stall.listing)}${on ? " is-on" : ""}`}>
                    <rect x={b.x + 0.6} y={b.y} width={b.w - 1.2} height={b.h} rx={4} />
                    <text x={b.x + b.w / 2} y={b.y + b.h / 2} dominantBaseline="central" textAnchor="middle" fontSize={23}>
                      {stall.number}
                    </text>
                  </g>
                );
              })}
              {trucks.map((truck) => {
                const b = truckBox(truck.number);
                const on = selectedTruckNumber === truck.number;
                return (
                  <g key={`m-truck-${truck.number}`} className={`mask-cell is-food${on ? " is-on" : ""}`}>
                    <rect x={b.x + 2} y={b.y + 2} width={b.w - 4} height={b.h - 4} rx={6} />
                    <text x={b.x + b.w / 2} y={b.y + b.h / 2} dominantBaseline="central" textAnchor="middle" fontSize={40}>
                      T{truck.number}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {showStalls && stalls.map((stall) => {
            const b = stallBox(stall.number);
            return (
              <button
                key={`stall-${stall.number}`}
                type="button"
                className={`stall-hotspot${selectedStallNumber === stall.number ? " stall-hotspot--active" : ""}`}
                style={{
                  left: px(b.x, MAP_W),
                  top: px(b.y - 26, MAP_H),
                  width: px(b.w, MAP_W),
                  height: px(b.h + 52, MAP_H)
                }}
                onClick={() => selectStall(selectedStallNumber === stall.number ? null : stall.number)}
                aria-label={`Stall ${stall.number}: ${stall.listing?.name ?? "Unassigned"}`}
                aria-pressed={selectedStallNumber === stall.number}
                title={`Stall ${stall.number}: ${stall.listing?.name ?? "Unassigned"}`}
              />
            );
          })}

          {showStalls && trucks.map((truck) => {
            const b = truckBox(truck.number);
            return (
              <button
                key={`truck-${truck.number}`}
                type="button"
                className={`stall-hotspot${selectedTruckNumber === truck.number ? " stall-hotspot--active" : ""}`}
                style={{ left: px(b.x, MAP_W), top: px(b.y, MAP_H), width: px(b.w, MAP_W), height: px(b.h, MAP_H) }}
                onClick={() => selectTruck(selectedTruckNumber === truck.number ? null : truck.number)}
                aria-label={`Food truck ${truck.number}: ${truck.listing?.name ?? "Unassigned"}`}
                aria-pressed={selectedTruckNumber === truck.number}
                title={`Food truck ${truck.number}: ${truck.listing?.name ?? "Unassigned"}`}
              />
            );
          })}
        </div>
      </div>

      <div className="legend">
        <span><i style={{ color: "var(--brand)" }} />Stage, culture &amp; food</span>
        <span><i style={{ color: "var(--clay-600)" }} />Toilets, first aid &amp; help</span>
        <span><i style={{ color: "var(--faint)" }} />Parking &amp; entry</span>
        <span><i style={{ color: "var(--saffron-700)" }} />Food stalls &amp; trucks</span>
        <span><i style={{ color: "var(--oxblood-700)" }} />Market &amp; services</span>
      </div>

      <section className="map-market" aria-labelledby="market-stalls-heading">
        <div className="row row--between">
          <div>
            <p className="eyebrow" style={{ marginBottom: 3 }}>Market row</p>
            <h2 id="market-stalls-heading">Stalls 1–20</h2>
          </div>
          <span className="small muted">Tap for details</span>
        </div>
        <div className="stall-grid">
          {stalls.map((stall) => (
            <button
              key={stall.number}
              type="button"
              className="stall-tile"
              aria-pressed={selectedStallNumber === stall.number}
              onClick={() => selectStall(stall.number)}
            >
              <strong>{stall.number}</strong>
              <span>{stall.listing?.name ?? "Unassigned"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="map-market" aria-labelledby="food-trucks-heading">
        <div className="row row--between">
          <div>
            <p className="eyebrow" style={{ marginBottom: 3 }}>Western edge</p>
            <h2 id="food-trucks-heading">Food trucks</h2>
          </div>
          <span className="small muted">Four trucks</span>
        </div>
        <div className="stall-grid stall-grid--trucks">
          {trucks.map((truck) => (
            <button
              key={truck.number}
              type="button"
              className="stall-tile stall-tile--food"
              aria-pressed={selectedTruckNumber === truck.number}
              onClick={() => selectTruck(truck.number)}
            >
              <strong>T{truck.number}</strong>
              <span>{truck.listing?.name ?? "Unassigned"}</span>
            </button>
          ))}
        </div>
      </section>

      {(selected || spot) && (
        <div className="map-sheet">
          <div className="row row--between" style={{ flexWrap: "nowrap", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>
                {spot ? spotLabel : selected?.type}
              </p>
              <h2 style={{ margin: 0, fontSize: "var(--step-2)" }}>
                {spot ? spot.listing?.name ?? "Not yet assigned" : selected ? t(selected.name, locale) : ""}
              </h2>
            </div>
            <button type="button" className="btn btn--icon btn--sm" onClick={() => (spot ? clearSpot() : select(null))} aria-label="Close details">
              <X size={16} />
            </button>
          </div>
          {spot?.listing?.logo && (
            <div className={`stall-logo${spot.listing.id === "accent-windows" ? " stall-logo--dark" : ""}`}>
              <img src={spot.listing.logo} alt={`${spot.listing.name} logo`} />
            </div>
          )}
          {spot?.listing?.description && (
            <p className="small muted" style={{ marginTop: 10 }}>{t(spot.listing.description, locale)}</p>
          )}
          {spot && !spot.listing && (
            <p className="small muted" style={{ marginTop: 10 }}>This space is being held and has no vendor assigned.</p>
          )}
          {selected?.description && <p className="small muted" style={{ marginTop: 10 }}>{t(selected.description, locale)}</p>}
          {route && (
            <p className="small" style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Navigation size={15} style={{ flex: "0 0 auto", color: "var(--brand)", marginTop: 2 }} />
              <span>{t(route.steps[0], locale)}</span>
            </p>
          )}
          {selected?.accessibilityNotes && (
            <p className="small" style={{ display: "flex", gap: 8, marginTop: 8, color: "var(--clay-700)" }}>
              <Accessibility size={15} style={{ flex: "0 0 auto", marginTop: 2 }} />
              <span>{t(selected.accessibilityNotes, locale)}</span>
            </p>
          )}
        </div>
      )}

      <section className="section">
        <h2>Every location</h2>
        <p className="small muted">Numbers match the map above.</p>
        <ul className="stack" style={{ listStyle: "none", padding: 0, marginTop: "var(--s-3)" }}>
          {visible.map((location) => (
            <li key={location.id}>
              <button
                type="button"
                className="card card-link row"
                style={{ gap: 12, width: "100%", textAlign: "left", flexWrap: "nowrap", cursor: "pointer" }}
                onClick={() => select(location.id)}
              >
                <span className={`icon-disc${location.type === "amenity" ? " icon-disc--jade" : location.type === "parking" ? " icon-disc--dark" : ""}`}
                      style={{ fontWeight: 800, width: 36, height: 36, flex: "0 0 36px", fontSize: "var(--step--1)" }}>
                  {locationNumbers.get(location.id)}
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
