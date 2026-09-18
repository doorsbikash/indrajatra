export type Locale = "en" | "ne" | "new";
export type LocalizedText = { en: string; ne?: string; new?: string };
export type MediaRef = { src: string; alt: LocalizedText; credit?: string };
export type FeatureFlags = { aiGuide: boolean; push: boolean; volunteerBoard: boolean; checkIn: boolean };

export type EventConfig = {
  id: string;
  name: LocalizedText;
  shortName: LocalizedText;
  tagline: LocalizedText;
  intro: LocalizedText;
  startAt: string;
  endAt: string;
  timezone: "Australia/Melbourne";
  venueName: string;
  venueAddress: string;
  venueMapsUrl?: string;
  entryCost: LocalizedText;
  statusOverride?: "upcoming" | "live" | "finished";
  heroMedia: MediaRef;
  organiser: string;
  /** Short name used in the app bar and footer. */
  brandName: string;
  organiserUrl?: string;
  eventbriteUrl?: string;
  membershipUrl?: string;
  newsletterUrl?: string;
  donateUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  socials?: { label: string; url: string }[];
  featureFlags: FeatureFlags;
};

export type ScheduleStatus = "scheduled" | "preparing" | "live" | "delayed" | "completed" | "cancelled";

export type ScheduleItem = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description?: LocalizedText;
  scheduledStart: string;
  scheduledEnd?: string;
  effectiveStart?: string;
  effectiveEnd?: string;
  status: ScheduleStatus;
  delayMinutes?: number;
  locationId: string;
  categoryIds: string[];
  relatedTrailPointIds?: string[];
  image?: MediaRef;
  highlight?: boolean;
  published: boolean;
  updatedAt: string;
  updatedBy?: string;
};

export type LocationType =
  | "stage" | "culture" | "food" | "market" | "amenity" | "entry" | "parking" | "community";

export type Location = {
  id: string;
  slug: string;
  name: LocalizedText;
  type: LocationType;
  mapX: number;
  mapY: number;
  description?: LocalizedText;
  accessibilityNotes?: LocalizedText;
  nearbyLocationIds?: string[];
  published: boolean;
};

export type TrailPoint = {
  id: string;
  number: number;
  slug: string;
  qrCodes: string[];
  title: LocalizedText;
  nativeName?: string;
  pronunciation?: string;
  teaser: LocalizedText;
  body: LocalizedText;
  whyItMatters?: LocalizedText;
  lookFor?: LocalizedText;
  locationId: string;
  heroMedia?: MediaRef;
  relatedScheduleItemIds?: string[];
  relatedTrailPointIds?: string[];
  sources?: { label: string; url?: string }[];
  reviewStatus: "draft" | "reviewed" | "approved";
  published: boolean;
};

export type Listing = {
  id: string;
  slug: string;
  name: string;
  listingType: "food" | "market" | "community" | "sponsor";
  categories: string[];
  description?: LocalizedText;
  highlights?: LocalizedText[];
  dietaryTags?: string[];
  /** Operational details visible in the organiser console, never the visitor directory. */
  organiserNotes?: string[];
  locationId?: string;
  websiteUrl?: string;
  socialUrl?: string;
  logo?: string;
  sponsorTier?: string;
  confirmed?: boolean;
  published: boolean;
};

export type Announcement = {
  id: string;
  title: LocalizedText;
  message: LocalizedText;
  severity: "info" | "update" | "important" | "emergency";
  startsAt: string;
  endsAt?: string;
  published: boolean;
};

export type InfoCard = {
  id: string;
  icon: "firstaid" | "lost" | "access" | "parking" | "toilet" | "water" | "weather" | "quiet" | "police" | "food";
  title: LocalizedText;
  body: LocalizedText;
  action?: { label: string; href: string };
  locationId?: string;
};

export type FaqItem = { id: string; q: LocalizedText; a: LocalizedText };

export type MapRoute = {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  steps: LocalizedText[];
  accessibleNotes?: LocalizedText;
};

export type FestivalData = {
  event: EventConfig;
  schedule: ScheduleItem[];
  locations: Location[];
  trailPoints: TrailPoint[];
  listings: Listing[];
  announcements: Announcement[];
  routes: MapRoute[];
  infoCards: InfoCard[];
  faqs: FaqItem[];
};
