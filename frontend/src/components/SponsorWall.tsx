import { useApp } from "../app/AppContext";
import type { Listing } from "../lib/types";

const PAID_TIERS = ["Platinum", "Gold", "Silver"] as const;
const PARTNER_TIERS = [
  "Media Partners", "Photography Partner", "Community Supporters",
  "In Association With", "Valued Contributor"
] as const;

/**
 * The sponsor wall, grouped by tier. Used on the home screen (where the
 * most people see it) and again in full on the directory page.
 */
export function SponsorWall({ compact = false }: { compact?: boolean }) {
  const { data } = useApp();
  const sponsors = data.listings.filter((l) => l.published && l.listingType === "sponsor");
  if (!sponsors.length) return null;
  const tiers = compact ? PAID_TIERS : [...PAID_TIERS, ...PARTNER_TIERS];

  return (
    <div className={`sponsor-wall${compact ? " sponsor-wall--compact" : ""}`}>
      {tiers.map((tier) => {
        const inTier = sponsors.filter((s: Listing) => s.sponsorTier === tier);
        if (!inTier.length) return null;
        return (
          <div key={tier} className="sponsor-wall__tier">
            <p className="tier-label">{tier}</p>
            <div className={`sponsor-grid sponsor-grid--${tier.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              {inTier.map((sponsor) => (
                <div className="sponsor-tile" key={sponsor.id} title={sponsor.name}>
                  {sponsor.logo ? (
                    <img src={sponsor.logo} alt={sponsor.name} loading="lazy" decoding="async" />
                  ) : (
                    <span className="sponsor-placeholder">{sponsor.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
