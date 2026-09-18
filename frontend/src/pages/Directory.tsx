import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MapPin, Utensils } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Empty } from "../components/ui";
import { SponsorWall } from "../components/SponsorWall";
import { t } from "../lib/text";
import { trackEvent } from "../lib/analytics/track";

const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "food", label: "Food & drink" },
  { id: "market", label: "Market & crafts" },
  { id: "community", label: "Community" }
];

export function DirectoryPage() {
  const { data, locale } = useApp();
  const [filter, setFilter] = useState("all");

  const listings = data.listings
    .filter((l) => l.published && l.listingType !== "sponsor")
    .filter((l) => filter === "all" || l.listingType === filter);

  return (
    <main className="page">
      <p className="eyebrow">Who's here</p>
      <h1>Food &amp; stalls</h1>
      <p className="lead">
        Hot food runs along the western edge of the site. Market and community stalls are the
        row of twenty near the lake. Bring some cash — reception out here can be patchy.
      </p>

      <div className="chips" role="group" aria-label="Filter stalls">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {listings.length === 0 ? (
        <Empty icon={<Utensils size={22} />} title="Nothing in this category yet">
          More stallholders are being confirmed in the week before the festival.
        </Empty>
      ) : (
        <div className="stack">
          {listings.map((listing) => {
            const location = data.locations.find((l) => l.id === listing.locationId);
            return (
              <article className="listing" key={listing.id}>
                <span className="listing__logo" aria-hidden>
                  {listing.logo ? <img src={listing.logo} alt="" /> : listing.name[0]}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3>{listing.name}</h3>
                  {listing.description && <p>{t(listing.description, locale)}</p>}
                  <div className="tags">
                    {listing.categories
                      .filter((cat) => !listing.dietaryTags?.includes(cat))
                      .map((cat) => <span className="tag" key={cat}>{cat}</span>)}
                    {listing.dietaryTags?.map((tag) => <span className="tag tag--diet" key={tag}>{tag}</span>)}
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    {location && (
                      <Link
                        className="btn btn--sm"
                        to={`/map?at=${location.id}`}
                        onClick={() => trackEvent("stall_viewed", { id: listing.id })}
                      >
                        <MapPin size={14} />{t(location.name, locale)}
                      </Link>
                    )}
                    {listing.websiteUrl && (
                      <a className="btn btn--sm btn--quiet" href={listing.websiteUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} />Visit
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="divider-motif" aria-hidden />

      <section>
        <p className="eyebrow eyebrow--gold">Made possible by</p>
        <h2>Sponsors &amp; partners</h2>
        <p className="small muted">
          Entry is free because these businesses paid for it. They are thanked from the stage
          at 3:30pm — and they are worth your business in return.
        </p>

        <div style={{ marginTop: "var(--s-5)" }}>
          <SponsorWall />
        </div>

        <div className="card card--sunk" style={{ marginTop: "var(--s-6)" }}>
          <h3>Sponsor next year's festival</h3>
          <p className="small muted">
            Choose from the current sponsorship packages and tell the team about your business using
            Newa Guthi Victoria's secure website form.
          </p>
          <a
            className="btn btn--sm btn--gold"
            href="https://newaguthi.org.au/sponsors/#sponsorship-form"
            target="_blank"
            rel="noreferrer"
          >
            Register sponsorship interest
          </a>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>Want a stall next year?</h3>
          <p className="small muted">
            Expressions of interest open in the middle of the year. Food vendors need a food
            registration certificate and public liability insurance.
          </p>
          <a className="btn btn--sm" href="mailto:info@newaguthi.org.au?subject=Stall%20EOI%20-%20Indra%20Jatra">
            Register your interest
          </a>
        </div>
      </section>
    </main>
  );
}
