import { Mail } from "lucide-react";
import { seedData } from "../content/seed/data";
import type { Listing } from "../lib/types";

const SPONSOR_TIERS = [
  "Platinum",
  "Gold",
  "Silver",
  "In Association With",
  "Photography Partner",
  "Media Partner",
  "Community Supporters",
  "Valued Contributor"
] as const;

const sponsors = seedData.listings.filter(
  (listing) => listing.published && listing.listingType === "sponsor"
);

const stallholders = seedData.listings.filter(
  (listing) =>
    listing.published &&
    listing.slug !== "accent-windows" &&
    (listing.locationId === "market-row" || listing.locationId === "food-trucks")
);

const tierClass = (tier: string) => tier.toLowerCase().replace(/[^a-z]+/g, "-");

function Logo({ listing }: { listing: Listing }) {
  return listing.logo ? (
    <img src={listing.logo} alt={listing.name} loading="lazy" decoding="async" />
  ) : (
    <strong>{listing.name}</strong>
  );
}

export default function App() {
  return (
    <div className="post-event">
      <header className="post-header">
        <a href="https://newaguthi.org.au" className="post-brand" aria-label="Newa Guthi Victoria website">
          <img src="/brand/ngv-mark.png" alt="" width="42" height="42" />
          <span>
            <small>Newa Guthi Victoria</small>
            <strong>Indra Jatra 2026</strong>
          </span>
        </a>
      </header>

      <main>
        <section className="post-hero">
          <img src="/images/festival-hero.jpg" alt="Pulukisi dancing through the Indra Jatra Melbourne festival" />
          <div className="post-hero__shade" />
          <div className="post-hero__content">
            <p className="post-kicker">Yenya Punhi Melbourne 2026</p>
            <h1>Thank you, Melbourne</h1>
            <p>
              Thank you to everyone who celebrated with us, volunteered, performed, supported a stall,
              and helped carry the festival forward.
            </p>
          </div>
        </section>

        <section className="post-intro" aria-labelledby="partners-heading">
          <p className="post-kicker">With heartfelt appreciation</p>
          <h2 id="partners-heading">Our sponsors, partners and supporters</h2>
          <p>
            This free community festival was made possible by the organisations and people below.
            Please remember and support the businesses that supported Indra Jatra.
          </p>
        </section>

        <div className="partner-wall">
          {SPONSOR_TIERS.map((tier) => {
            const listings = sponsors.filter((listing) => listing.sponsorTier === tier);
            if (!listings.length) return null;
            return (
              <section className="partner-tier" key={tier} aria-labelledby={`tier-${tierClass(tier)}`}>
                <div className="section-heading">
                  <h3 id={`tier-${tierClass(tier)}`}>{tier}</h3>
                  <span>{listings.length}</span>
                </div>
                <div className={`partner-grid partner-grid--${tierClass(tier)}`}>
                  {listings.map((listing) => (
                    <div className="partner-logo" key={listing.id} title={listing.name}>
                      <Logo listing={listing} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="stall-section" aria-labelledby="stallholders-heading">
          <div className="stall-section__intro">
            <p className="post-kicker">Festival marketplace</p>
            <h2 id="stallholders-heading">Thank you to our stallholders</h2>
            <p>
              Our food vendors, makers, community groups and local businesses brought flavour,
              colour and energy to the festival. We are proud to recognise them here.
            </p>
          </div>

          <div className="stall-grid">
            {stallholders.map((listing) => (
              <article className="stall" key={listing.id} title={listing.name}>
                <div className="stall__logo"><Logo listing={listing} /></div>
              </article>
            ))}
          </div>
        </section>

        <section className="post-closing">
          <img src="/brand/ngv-mark.png" alt="" width="64" height="64" />
          <div>
            <p className="post-kicker">The celebration continues</p>
            <h2>Preserving heritage, building community</h2>
            <p>Visit Newa Guthi Victoria for community news, classes, membership and future events.</p>
          </div>
          <a className="post-button" href="https://newaguthi.org.au">Visit newaguthi.org.au</a>
        </section>
      </main>

      <footer className="post-footer">
        <span>© 2026 Newa Guthi Victoria</span>
        <a href="mailto:info@newaguthi.org.au"><Mail size={15} />info@newaguthi.org.au</a>
      </footer>
    </div>
  );
}
