import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "../app/AppContext";
import type { Listing } from "../lib/types";

const PAID_TIERS = ["Platinum", "Gold", "Silver"] as const;
const PARTNER_TIERS = [
  "Photography Partner", "Media Partner", "Community Supporters",
  "Valued Contributor"
] as const;

/* Studio logos are all light artwork on black, so their tier gets the dark
   tile. Anything else needing it is listed by slug. */
const DARK_TIERS = new Set<string>(["Photography Partner"]);
const DARK_SLUGS = new Set<string>(["elite-curtains"]);
const needsDarkTile = (s: Listing) =>
  DARK_TIERS.has(s.sponsorTier ?? "") || DARK_SLUGS.has(s.slug);

/**
 * The sponsor wall, grouped by tier. On the home screen it opens showing the
 * paid tiers and reveals the partners, supporters and contributors on demand,
 * so the fold is not pushed a screen and a half down. The directory page
 * shows everything from the start.
 */
export function SponsorWall({ compact = false }: { compact?: boolean }) {
  const { data } = useApp();
  const [expanded, setExpanded] = useState(false);

  const sponsors = data.listings.filter((l) => l.published && l.listingType === "sponsor");
  if (!sponsors.length) return null;

  const inTier = (tier: string) => sponsors.filter((s: Listing) => s.sponsorTier === tier);
  const partnerCount = PARTNER_TIERS.reduce((total, tier) => total + inTier(tier).length, 0);
  const showPartners = !compact || expanded;
  const tiers = showPartners ? [...PAID_TIERS, ...PARTNER_TIERS] : PAID_TIERS;

  return (
    <div className={`sponsor-wall${compact ? " sponsor-wall--compact" : ""}`}>
      {tiers.map((tier) => {
        const listed = inTier(tier);
        if (!listed.length) return null;
        return (
          <div key={tier} className="sponsor-wall__tier">
            <p className="tier-label">{tier}</p>
            <div className={`sponsor-grid sponsor-grid--${tier.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              {listed.map((sponsor) => (
                <div className={`sponsor-tile${needsDarkTile(sponsor) ? " sponsor-tile--dark" : ""}`} key={sponsor.id} title={sponsor.name}>
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

      {compact && partnerCount > 0 && (
        <button
          type="button"
          className="btn btn--sm btn--block sponsor-wall__more"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <ChevronDown size={15} className={expanded ? "is-flipped" : undefined} />
          {expanded ? "Show fewer" : `Show all ${partnerCount} partners & supporters`}
        </button>
      )}
    </div>
  );
}
