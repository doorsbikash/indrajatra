# Indra Jatra Melbourne 2026 — Complete Codex Build Handoff

## 0. How to use this document

This is the authoritative product and implementation brief for a local coding agent. Put this file in the root of a new repository and instruct Codex to read it completely before changing files.

The agent must build a working, polished application without stopping for routine questions. Where credentials, final artwork, translations, cultural approval, venue coordinates, or final timetable data are unavailable, it must:

1. implement the complete interface and integration boundary;
2. use realistic, clearly labelled seed/demo data;
3. add the missing value to `docs/CONTENT_AND_LAUNCH_CHECKLIST.md`;
4. continue building everything else;
5. never fabricate approved cultural facts or production credentials.

The target is a mobile-first Progressive Web App at:

`https://indrajatra.newaguthi.org.au`

The application is a digital companion for a free public cultural festival. It is not a ticket-selling application and must not require an account for normal visitor use.

---

## 1. Event and organisation context

### Organisation

- Organisation: Newa Guthi Victoria
- Community purpose: Preserve, teach, celebrate, and share Newa culture in Victoria
- Existing activities include Dhimey and flute classes, cultural events, membership, volunteering, and newsletters
- The organisation wants the event to demonstrate how modern technology and AI can support an ancient living tradition without trivialising it

### Event

- Public name: Yenya Punhi — Indra Jatra Melbourne 2026
- Short name: Indra Jatra Melbourne 2026
- Date: Saturday, 26 September 2026
- Public event hours: 10:00 AM–4:00 PM
- Venue: Australian Nepalese Multicultural Centre (ANMC), Diggers Rest, Victoria, Australia
- Attendance expectation: 10,000+ people
- Admission: Free; registration is handled through Eventbrite
- Primary audience: Newa and Nepali community members, families, children, wider Victorian community, invited guests, stallholders, sponsors, volunteers, and first-time visitors
- Event operations may change during the day, so live status is more valuable than a static timetable

### Product positioning

Working concept:

> Ancient tradition. Digital experience.

Supporting line:

> Explore Yenya Punhi — Indra Jatra Melbourne through culture, stories and technology.

The QR experience should be branded as the **Yenya Digital Cultural Trail**, not merely “QR codes.”

---

## 2. Product outcomes

The PWA should let a visitor answer these questions in a few seconds:

- What is happening now?
- What is happening next?
- Where is it happening?
- What is this cultural object, character, food, or ritual?
- How do I get to toilets, first aid, food, the main stage, or the information desk?
- What have I already explored?
- How can I register, join Newa Guthi, volunteer, attend classes, or subscribe?

It should also let authorised organisers:

- start, delay, relocate, cancel, or complete a scheduled activity;
- publish urgent and general announcements;
- keep the visitor schedule current from a phone;
- view simple engagement metrics;
- edit operational content without redeploying the website.

Business/community outcomes:

- Improve the visitor experience and cultural understanding
- Turn free Eventbrite registrations into actual attendance insight where practical
- Promote a festival-only 25% membership discount
- Generate newsletter, membership, class, and volunteer leads
- Give sponsors and stallholders digital exposure
- Capture privacy-conscious aggregate engagement statistics for future grants and sponsorship proposals
- Create a reusable platform for future Newa Guthi events

---

## 3. Delivery priorities

Build in this order, but complete the whole repository in one continuous run where possible.

### P0 — required for launch

1. Mobile-first home/festival mode
2. Live “Now / Next / Later” program
3. Full schedule with filters
4. Yenya Digital Cultural Trail pages accessed by human-readable routes and QR routes
5. Venue map with landmarks, amenities, “you scanned here,” and accessible directions
6. Food, market, community, and sponsor directory
7. About Newa Guthi, membership offer, classes, volunteer, and newsletter links/forms
8. Announcements and emergency information
9. Installable PWA with useful offline fallback
10. Basic organiser dashboard for live program and announcements
11. Seed data sufficient to demonstrate every screen locally
12. Accessibility, SEO, privacy, error states, empty states, and automated tests

### P1 — important engagement features

1. My Indra Jatra: saved activities stored locally, no login required
2. Cultural Passport progress stored locally
3. “Yenya Explorer 2026” completion badge/certificate screen
4. Calendar-file reminder fallback for saved activities
5. Multilingual architecture for English, Nepali, and Nepal Bhasa
6. Anonymous analytics event layer
7. Eventbrite deep link and digital-pass placeholder/adaptor

### P2 — feature-flagged until content and credentials are ready

1. Ask Yenya AI grounded only in approved cultural and operational content
2. Web push notifications where browser/platform support permits
3. Volunteer operations/request board
4. Entry check-in/Eventbrite attendance integration
5. Real-time aggregate analytics dashboard

Do not let P2 delay a launch-ready P0/P1 application.

---

## 4. Recommended technical architecture

Use the current stable releases available at implementation time. Do not pin obsolete versions merely because this brief names a framework.

### Application

The production target is the organisation's existing **Hostinger hosting account**, which already hosts a WordPress site and is accessible by SSH. Do not assume a persistent Node.js runtime, Docker, Firebase, or Cloud Run is available. Build the public application as static assets and the dynamic API in PHP/MySQL so it works on a typical Hostinger web/shared-hosting plan.

- Vite + React
- TypeScript in strict mode
- React Router with an Apache `.htaccess` history fallback
- Tailwind CSS
- An accessible component system such as shadcn/ui or equivalent, customised to the festival brand
- Zod for runtime validation
- React Hook Form for non-trivial forms
- `react-i18next`, FormatJS, or an equivalent route-safe translation system
- PWA manifest and Workbox/Vite PWA integration
- Vitest and React Testing Library for unit/component tests
- Playwright for critical end-to-end journeys
- ESLint and Prettier

### Backend, database, and live updates

Preferred production implementation:

- PHP 8.2+ JSON API under `/api`
- Composer with PSR-4 autoloading and a small maintained router/framework if useful; avoid a large framework unless Hostinger capability and deployment benefit justify it
- PDO with prepared statements
- MySQL 8 or the current MySQL/MariaDB version supplied by Hostinger
- Secure PHP session-cookie authentication for organisers
- Password hashing with PHP's `password_hash()` / `password_verify()`
- Server-side role enforcement and CSRF protection on state-changing authenticated requests
- Polling with ETag/`updated_at` support for live schedule and announcements; default 20–30 seconds while the festival is live and less frequently otherwise
- Same-origin frontend/API deployment to avoid unnecessary CORS complexity
- Media stored in an explicitly configured uploads directory or the existing WordPress media library only if that integration is intentionally chosen

Use a **separate MySQL database and a separate least-privilege database user** for this PWA. Do not put the application's tables into the existing WordPress database unless Hostinger plan limits make a second database impossible. If sharing is unavoidable, use a unique table prefix such as `ij26_`, never reuse WordPress credentials in client code, and document backup/rollback risks.

The application must include two interchangeable repository implementations:

1. `SeedRepository`: reads typed seed content from the repository and enables the full local demonstration with no database credentials.
2. `ApiRepository`: consumes the same-origin PHP API backed by MySQL.

Use a build environment variable such as `VITE_DATA_PROVIDER=seed|api`. Default to `seed` in `.env.example` and development. PHP database configuration must be server-side only, preferably loaded from an `.env` file stored outside `public_html` or from Hostinger environment configuration. Include a safe configuration fallback pattern that never exposes secrets.

Never expose database credentials, admin password hashes, or private configuration to the browser. All mutations go through authenticated PHP endpoints.

### Deployment

Design first for SSH deployment to the existing Hostinger account:

- The subdomain `indrajatra.newaguthi.org.au` should have its own document root, separate from the existing WordPress document root.
- The Vite production build is uploaded to that subdomain document root.
- The PHP API is deployed beneath `/api` (or outside the public root with only a public entry point exposed).
- Composer production dependencies are installed using `composer install --no-dev --optimize-autoloader` either locally before upload or over SSH, depending on Hostinger support.
- MySQL schema changes use ordered, idempotent migrations and a migration tracking table.
- Provide Apache `.htaccess` rules for SPA fallback, HTTPS, compression/cache headers, security headers where supported, and protection of sensitive files. Requests under `/api` must not be rewritten to `index.html`.
- Include `GET /api/health` that verifies application availability without leaking secrets. A deeper database check may be admin-only.
- Provide an SSH deployment script that builds locally, uploads only intended release files using `rsync` or `scp`, runs migrations with explicit confirmation/backup guidance, preserves user uploads, and supports rollback to the previous release.
- Do not overwrite, move, or reconfigure the existing WordPress installation.
- Document subdomain creation, DNS, document-root selection, SSL activation, PHP version/extensions, MySQL database/user creation, cron availability, backups, deployment, and rollback.
- Keep secrets and writable runtime directories out of Git and out of downloadable/public paths.

If inspection later confirms the specific Hostinger plan supports persistent Node applications, that may be documented as an alternative, but the required production path remains static React + PHP/MySQL because it is broadly compatible with the existing hosting.

### External services as adapters

- Eventbrite: registration deep link initially; API/check-in integration behind an interface
- Membership/payment: external Newa Guthi membership URL initially
- Newsletter: provider-neutral server-side adapter; include a safe mock mode
- Maps: custom illustrated festival map first; optional Google Maps directions deep link, not a dependency for basic navigation
- AI: server-side PHP provider adapter with retrieval from approved content only; disabled unless credentials and approved knowledge are present
- Analytics: provider-neutral `trackEvent()` API; console/no-op adapter in local development

---

## 5. Repository structure

Use a coherent structure similar to:

```text
frontend/
  src/
    pages/
      HomePage.tsx
      SchedulePage.tsx
      ExplorePage.tsx
      TrailPointPage.tsx
      ScanPage.tsx
      MapPage.tsx
      ListingsPage.tsx
      MyFestivalPage.tsx
      AnnouncementsPage.tsx
      AboutPage.tsx
      MembershipPage.tsx
      AskYenyaPage.tsx
      InfoPage.tsx
      admin/
    components/
    content/seed/
    locales/
    lib/
      repositories/
      analytics/
      dates/
      validation/
  public/
    icons/
    images/
    map/
  vite.config.ts
backend/
  public/
    index.php
    .htaccess
  src/
    Controllers/
    Middleware/
    Repositories/
    Services/
    Validation/
  config/
  database/
    migrations/
    seeds/
  tests/
  composer.json
deploy/
  .htaccess
  deploy-hostinger.sh
  rollback-hostinger.sh
  release-template/
docs/
  ARCHITECTURE.md
  ADMIN_GUIDE.md
  CONTENT_AND_LAUNCH_CHECKLIST.md
  DEPLOYMENT.md
  QR_PRINT_GUIDE.md
tests/
```

The agent may adjust this structure when technically justified, but must keep frontend, backend, data access, and external integrations separated. If frontend and backend tests are colocated within their respective directories, the empty root `tests/` directory is unnecessary.

---

## 6. Visitor information architecture

Persistent mobile navigation should provide no more than five primary destinations:

1. Home
2. What’s On
3. Map
4. Explore
5. My Festival

Secondary items live in a More/menu sheet:

- Food & Stalls
- Announcements
- Ask Yenya
- About Newa Guthi
- Membership
- Classes and volunteering
- Event information and emergency help
- Language
- Privacy

### Home / Festival Mode

Top section:

- Event name, date, venue
- Status badge: Upcoming / Live / Finished
- During event hours, make “LIVE” and operational content visually dominant
- Eventbrite registration CTA before the event
- “Add to Home Screen” education where supported; never block the page

Primary live card:

- NOW: title, time, location, status, directions
- NEXT: title, time, countdown, location, save/remind, learn more
- A short “Later” list
- Handle delayed, moved, cancelled, and completed states clearly

Quick actions:

- What’s on now
- Map
- Explore cultural trail
- Food & stalls
- Ask Yenya (only when enabled)
- Emergency/info

Additional sections:

- Latest important announcement
- Cultural Trail progress
- Saved activity preview
- Membership offer shown contextually, especially after three cultural discoveries; never use intrusive repeated pop-ups
- Sponsors/supporters strip
- About Newa Guthi teaser

### Schedule

- Timeline grouped by time
- Filters: All, Main Stage, Cultural Area, Procession, Food/Community, Children/Family (final categories configurable)
- Live state and current time indicator
- Each item has time, title, short description, location, status, saved state, and directions
- Search is optional; filters are more important
- Create `.ics` files for individual activities without relying on push notifications
- Use `Australia/Melbourne` for all event schedule calculation and display, including daylight-saving-safe date handling

### Explore / Cultural Trail

Grid/list of cultural points with numbered marker, image/illustration, title, short teaser, scan/discovery status, and next related activity.

Initial trail points:

1. Indra Statue
2. Swet Bhairab
3. Chariot 1
4. Chariot 2
5. Lakhey
6. Kumari
7. Pulukisi
8. Dhimey
9. Flute/Bansuri
10. Samay Baji
11. Newa Guthi Station
12. Main Stage / Yenya Story point

These are initial product entities, not approved cultural copy. Seed descriptions must be visibly marked in source metadata as `reviewStatus: "draft"`. Public production mode must support showing only approved content.

Each detail page should include:

- Cultural name and optional native-script names
- Hero visual
- 1–3 minute readable explanation
- “Why it matters” section
- Optional audio pronunciation and short video
- Related activities and next time
- “You are here” when opened from the location QR
- Nearby destinations and approximate walking time
- Mark discovered automatically when a valid trail QR is visited
- Share link
- Approved-source attribution where applicable
- Class/membership/community connection where relevant

### QR routing

Use stable QR URLs such as:

`https://indrajatra.newaguthi.org.au/scan/lakhey-zone`

The server resolves the scan code to a location and cultural item, records an anonymous scan event, stores the last scanned location locally, marks the item discovered, and redirects/renders the correct contextual experience.

Requirements:

- Codes must remain stable even if display titles or destination slugs change
- Invalid/deactivated codes show a helpful recovery page with Explore, Map, and Home links
- Add optional campaign parameters without breaking code resolution
- Do not place personal data in QR URLs
- Provide a print guide and a script/page that generates a CSV of QR code labels and target URLs
- If practical, generate print-ready SVG/PNG QR assets from seed/production data

### Map

Use a custom illustrated venue map rather than depending on GPS precision. It must support:

- Pan/zoom on mobile
- Category filters
- Selectable markers
- A “You scanned here” marker derived from the visitor’s last QR location
- Amenity markers: toilets, accessible toilets, first aid, water, information, entry/exit, parking, main stage, food zone, cultural points, chariots
- Accessible route notes stored as content
- “Take me there” directions as step cards based on landmark-to-landmark routes
- Optional external directions link for reaching the venue
- Text/list alternative to the visual map for accessibility

Do not promise GPS-grade indoor/event-ground positioning. Say “Last scanned location” rather than “Your precise location.”

If the final illustrated map is unavailable, ship a polished schematic demo map and document exact asset requirements for replacement.

### Food, market, community, and sponsors

Directory filters:

- Newari
- Nepali
- Vegetarian
- Drinks
- Dessert
- Market
- Community
- Sponsors

Each listing supports:

- Name
- Logo/image
- Type/categories
- Short description
- Menu/product highlights (not a full commerce platform)
- Dietary tags and an allergy disclaimer
- Stall number/map location
- “Show on map”
- Website/social link
- Sponsor tier if applicable

Known names that may be used as clearly labelled draft seed examples where suitable include Pasa Ya Kitchen, MDA Twista Potato Melbourne, Maxi Max, Sapphire Estate Agents Melbourne, Impel Conveyancing, Accent Windows, NRNA Australia, and NAV. Do not publish guessed business details, sponsor levels, menus, logos, or links. The production checklist must require confirmation for every listing.

### My Indra Jatra

No account required. Use local storage/IndexedDB.

- Saved schedule items
- Cultural Passport progress, e.g. 5/12 discovered
- Last scanned map location
- Download/add calendar actions
- Reset personal festival data
- Completed passport celebration and “Yenya Explorer 2026” shareable certificate/badge screen

Privacy copy must explain that this information stays on the device unless the visitor explicitly submits a form.

### Membership and community conversion

- Offer: 25% off Newa Guthi membership during the festival; final code, terms, eligible plans, and expiry require confirmation
- Show the offer gently after engagement and on the dedicated membership page
- Explain that membership supports cultural preservation and programs
- CTAs: Become a member, Join newsletter, Learn Dhimey, Learn flute, Volunteer
- Use external URLs or provider-neutral forms configured through environment/content settings
- Never claim the discount applies until final terms have been configured

### Emergency and practical information

Always reachable quickly. Include editable fields for:

- First aid location
- Emergency procedure
- Lost children / lost property point
- Accessibility support
- Toilets and water
- Entry, parking, public transport, and weather notes
- Event contact number
- In a life-threatening emergency, call 000

Make it clear which contact is emergency services and which is event support.

---

## 7. Organiser/admin experience

The admin UI must work well on a phone and favour large, safe controls.

### Roles

- `viewer`: read dashboards
- `operator`: update live schedule states and announcements
- `editor`: edit public content and directory records
- `admin`: manage users/configuration

Seed mode must provide a clearly marked local demo admin experience without pretending it is secure production authentication. API mode must enforce PHP session authentication, CSRF protection, and server-side roles for every protected endpoint.

### Dashboard

- Current event status
- Current and next activities
- Active important announcement
- Items delayed/cancelled
- Quick actions
- Last update and updater identity
- Health/readiness warnings

### Schedule controls

For each schedule item:

- Start now
- Mark completed
- Delay by 5, 10, 15, or custom minutes
- Move location
- Cancel / restore
- Add operational note

Mutations must be auditable. Store `updatedAt`, `updatedBy`, previous key state, and action. Confirmation is required for cancel and destructive replacement actions. Routine delay/start/complete actions can use undo feedback.

### Announcements

Fields:

- Title
- Short message
- Severity: info, update, important, emergency
- Start/end publication time
- Optional related location/activity
- Optional CTA
- Published/draft

Emergency visual styling must not be used for marketing.

### Content editing

At minimum allow viewing/editing structured content for schedule, locations, trail points, stalls, announcements, event settings, and links. Rich CMS sophistication is not required. Validate all data and sanitise any rich text.

### Analytics dashboard

Show aggregate counts only:

- PWA sessions/users where provider permits
- Trail scans by location
- Map views
- Schedule views
- Saves/calendar downloads
- Membership CTA clicks
- Newsletter submissions
- Passport completions

Avoid collecting precise location or unnecessary personal data.

---

## 8. Data model

Implement typed schemas and Zod validation. The exact database representation may evolve, but preserve these concepts.

### EventConfig

```ts
type EventConfig = {
  id: string;
  name: LocalizedText;
  shortName: LocalizedText;
  tagline: LocalizedText;
  startAt: string;
  endAt: string;
  timezone: "Australia/Melbourne";
  venueName: string;
  venueAddress: string;
  statusOverride?: "upcoming" | "live" | "finished";
  eventbriteUrl?: string;
  membershipUrl?: string;
  newsletterUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  featureFlags: FeatureFlags;
};
```

### ScheduleItem

```ts
type ScheduleItem = {
  id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description?: LocalizedText;
  scheduledStart: string;
  scheduledEnd?: string;
  effectiveStart?: string;
  effectiveEnd?: string;
  status: "scheduled" | "preparing" | "live" | "delayed" | "completed" | "cancelled";
  delayMinutes?: number;
  locationId: string;
  categoryIds: string[];
  relatedTrailPointIds?: string[];
  image?: MediaRef;
  published: boolean;
  updatedAt: string;
  updatedBy?: string;
};
```

### Location

```ts
type Location = {
  id: string;
  slug: string;
  name: LocalizedText;
  type: "stage" | "culture" | "food" | "amenity" | "entry" | "parking" | "community";
  mapX: number;
  mapY: number;
  description?: LocalizedText;
  accessibilityNotes?: LocalizedText;
  nearbyLocationIds?: string[];
  published: boolean;
};
```

### TrailPoint

```ts
type TrailPoint = {
  id: string;
  number: number;
  slug: string;
  qrCodes: string[];
  title: LocalizedText;
  alternateNames?: LocalizedText;
  teaser: LocalizedText;
  body: LocalizedText;
  whyItMatters?: LocalizedText;
  locationId: string;
  heroMedia?: MediaRef;
  audio?: MediaRef;
  videoUrl?: string;
  relatedScheduleItemIds?: string[];
  relatedTrailPointIds?: string[];
  sources?: ContentSource[];
  reviewStatus: "draft" | "reviewed" | "approved";
  published: boolean;
};
```

### Listing

```ts
type Listing = {
  id: string;
  slug: string;
  name: string;
  listingType: "food" | "market" | "community" | "sponsor";
  categories: string[];
  description?: LocalizedText;
  highlights?: LocalizedText[];
  dietaryTags?: string[];
  locationId?: string;
  logo?: MediaRef;
  websiteUrl?: string;
  socialUrl?: string;
  sponsorTier?: string;
  published: boolean;
};
```

Also define `Announcement`, `QrCode`, `MapRoute`, `UserRole`, `AuditEntry`, and `AnalyticsEvent` schemas. Use string IDs and ISO-8601 timestamps.

`LocalizedText` should permit partial translations:

```ts
type LocalizedText = {
  en: string;
  ne?: string;
  new?: string; // Nepal Bhasa locale code selected for this project
};
```

Confirm the preferred locale code and language labels before production; isolate the code so it can be changed without rewriting content.

### MySQL persistence

Create migrations for at least these logical tables (names may be prefixed with `ij26_`):

- `schema_migrations`
- `event_config`
- `schedule_items`
- `schedule_item_categories`
- `locations`
- `trail_points`
- `trail_point_qr_codes`
- `trail_point_sources`
- `map_routes`
- `listings`
- `announcements`
- `admin_users`
- `admin_sessions` if sessions are database-backed
- `audit_entries`
- `analytics_daily_aggregates` if first-party aggregates are enabled

Requirements:

- Use `utf8mb4` throughout for English, Nepali, Nepal Bhasa, and emoji.
- Store canonical timestamps in UTC; application/event display uses `Australia/Melbourne`.
- Use JSON columns only when supported by the confirmed Hostinger database version and when the fields do not require relational filtering. Provide a compatible text/normalised alternative if necessary.
- Add foreign keys and indexes deliberately; cascades must not erase audit history.
- Include development seeders and a separate, explicit production bootstrap command.
- The first production administrator must be created through a CLI/bootstrap command over SSH, not a public registration page.
- Migrations must be safe to rerun, tracked, and backed up before production schema changes.
- Provide `.sql` export/import instructions as a fallback if Hostinger SSH cannot run the migration command.
- Never include production credentials or a real production database dump in the repository.

---

## 9. Live schedule logic

Create pure, well-tested functions for status and display ordering.

- Event timezone is always Australia/Melbourne
- `effectiveStart` overrides `scheduledStart` after a delay/manual update
- Explicit `live`, `completed`, and `cancelled` statuses take precedence over clock inference
- “Now” can show an explicitly live activity even if the planned time differs
- “Next” is the earliest published, non-completed, non-cancelled upcoming item by effective time
- Delayed items retain their original scheduled time in details and visibly show the updated time
- No current item is a valid state; display the next activity and a calm helpful message
- Multiple simultaneous live activities must be supported
- Client clock differences must not corrupt stored state

---

## 10. Ask Yenya AI

This feature must be disabled by default and controlled with `FEATURE_AI_GUIDE`.

Purpose:

- Explain approved cultural information
- Answer operational questions such as what is next and where amenities are
- Help visitors find classes, membership, stalls, and activities

Safety and grounding rules:

- Retrieve only from approved cultural content and current event records
- Do not answer cultural questions from general model memory when evidence is missing
- State when information has not been approved or is unavailable
- Show relevant source/page links beneath answers
- Never provide authoritative religious, historical, health, safety, or emergency claims without approved content
- Emergency questions should direct visitors to the event emergency information and 000 where appropriate
- Do not expose admin notes, drafts, personal information, or unpublished records
- Add rate limiting, input/output length limits, abuse handling, and basic prompt-injection resistance
- Do not store raw conversations by default; if telemetry is later enabled, disclose it
- Multilingual replies should follow the selected language when content support is adequate

Provide suggested questions and a deterministic search/help fallback so the page is useful even while the AI feature is disabled.

---

## 11. PWA and offline behaviour

- Valid web app manifest with event name, theme colours, icons, start URL, display mode, and screenshots placeholders
- Install guidance tailored to iOS Safari and supported Android browsers
- Cache the application shell, approved cultural pages, basic map, event info, and last-fetched schedule
- Always prefer fresh live schedule/announcement data when online
- Clearly label cached operational information with “Last updated …” when offline
- Do not cache authenticated admin responses in a way that leaks them
- Provide an offline page with emergency/basic event info, cached schedule, cached map, and reconnection action
- Handle service worker updates without trapping visitors on stale event data

Push notifications are optional and feature-flagged. Calendar files and prominent in-app announcements are the reliable baseline.

---

## 12. Design direction

The experience should feel celebratory, respectful, contemporary, and distinctly Newa—not like a generic SaaS dashboard.

Use a restrained visual system inspired by festival materials:

- Deep festival red as the primary accent
- Warm gold/saffron as a secondary accent
- Charcoal/near-black text
- Warm off-white backgrounds
- Optional deep blue accent used sparingly

Final colours must be configurable as design tokens because official brand assets may change them.

Design requirements:

- Mobile first; optimise for one-handed use outdoors
- Large tap targets (minimum 44×44 CSS pixels)
- Strong contrast and sunlight readability
- Important live information above decorative content
- Respectful geometric/pattern accents; do not invent sacred symbolism
- Use final supplied images/logos where available; otherwise use neutral, clearly replaceable placeholders
- Avoid excessive animation; respect `prefers-reduced-motion`
- Skeleton states and optimistic feedback where safe
- Admin interface prioritises clarity over festival decoration

Use semantic HTML, correct heading order, keyboard support, focus states, form labels, alt text, non-colour status indicators, and WCAG 2.2 AA as the target.

---

## 13. Internationalisation

Supported architecture:

- English (`en`) — complete initial interface
- Nepali (`ne`) — content-ready, with fallback to English
- Nepal Bhasa (`new` placeholder code) — content-ready, with fallback to English

Requirements:

- Locale-aware routes or a robust equivalent
- Persist language preference locally
- Do not use machine translation as approved public cultural copy
- Display an unobtrusive “translation pending” fallback only in preview/admin mode, not on every production card
- Support Devanagari fonts and text expansion
- Keep navigation labels and emergency content translatable
- Translation completeness report/script is desirable

---

## 14. Analytics and privacy

Create a typed analytics facade. Suggested anonymous events:

- `page_view`
- `qr_scan`
- `trail_point_view`
- `trail_point_discovered`
- `passport_completed`
- `schedule_view`
- `schedule_item_saved`
- `calendar_downloaded`
- `map_view`
- `map_marker_selected`
- `directions_opened`
- `announcement_viewed`
- `eventbrite_clicked`
- `membership_clicked`
- `newsletter_submitted`
- `class_clicked`
- `stall_viewed`
- `language_changed`
- `pwa_install_prompted`
- `pwa_installed`

Do not put names, emails, phone numbers, free-text AI questions, or precise location into analytics properties. Hashing personal data does not make unnecessary collection acceptable.

Include a concise privacy page describing local festival data, forms, third parties, analytics, and contact details. The exact legal copy requires organisational review.

---

## 15. Security requirements

- Validate all server inputs with Zod
- Enforce organiser roles on the server, not only in UI
- Configure secure cookies and headers
- Add Content Security Policy appropriate to actual external hosts
- Rate limit AI and public form endpoints
- Protect newsletter endpoint from abuse/honeypot/bots without inaccessible CAPTCHAs where possible
- Sanitise any user-editable rich text or store structured blocks instead of HTML
- Never commit `.env`, API keys, MySQL credentials, password hashes, or real attendee exports
- Add `.env.example` with descriptions, not secrets
- Apply least-privilege MySQL grants to a dedicated application database user
- Maintain audit logs for admin operational changes
- Treat Eventbrite attendee data as personal data; do not implement bulk storage unless explicitly required and reviewed
- Add dependency and build checks to CI

---

## 16. Seed data requirements

Local seed mode must make the app immediately demonstrable. Include:

- Correct event date/hours/timezone and draft venue name
- At least 10 schedule items spread from 10:00 AM to 4:00 PM
- At least one item in each status that can be toggled in demo admin mode
- All 12 Cultural Trail records with concise **draft/demo** text
- At least 15 locations/amenities on a schematic map
- At least 8 draft/demo listings across food, market, community, and sponsors
- Three announcements of differing severity, with only appropriate examples active
- Membership, class, newsletter, Eventbrite, and social links represented as configuration placeholders
- A deterministic simulated current-time control available only in development/demo admin mode, so Now/Next states can be tested outside event hours

Do not present invented cultural narratives or vendor arrangements as confirmed. Put review status in the seed source and surface draft warnings in admin preview.

---

## 17. Testing and quality gates

Before declaring completion, the agent must run and fix:

- package installation
- type checking
- linting
- frontend unit/component tests
- Composer validation and PHP unit/API tests
- migration and seed validation against a disposable local MySQL/MariaDB database when available
- production build
- Playwright smoke tests on a production-like server

Critical automated journeys:

1. Visitor opens home and sees current/next schedule state
2. Visitor scans a valid cultural QR, sees contextual content, and gains passport progress
3. Invalid QR produces a helpful recovery screen
4. Visitor saves an activity and sees it in My Festival after reload
5. Visitor downloads a valid calendar event
6. Visitor selects a map marker and gets text directions
7. Visitor filters stall listings
8. Visitor changes locale and fallback content still renders
9. Admin demo delays an activity and visitor data reflects the update in seed/demo mode
10. Admin publishes an announcement in demo mode
11. Offline mode provides a safe cached experience and visibly identifies stale live information
12. Unauthorised production admin mutation is rejected

Also check:

- responsive layouts around 320, 375, 768, and 1280px widths;
- keyboard-only navigation;
- basic automated accessibility checks;
- no obvious overflow with Devanagari and long text;
- Lighthouse-oriented performance, accessibility, SEO, and PWA fundamentals;
- no secrets or real personal data in repository history.

---

## 18. Required documentation and scripts

Produce:

- `README.md`: setup, commands, features, architecture summary, screenshots instructions
- `docs/ARCHITECTURE.md`: decisions, data flow, repository/adaptor approach
- `docs/ADMIN_GUIDE.md`: phone-friendly event-day operating instructions
- `docs/CONTENT_AND_LAUNCH_CHECKLIST.md`: every item Newa Guthi must confirm or provide
- `docs/DEPLOYMENT.md`: Hostinger subdomain, PHP/MySQL setup, SSH deployment, domain/DNS/SSL, backup, and rollback
- `docs/QR_PRINT_GUIDE.md`: size, quiet zone, contrast, correction level, test procedure, labelling, mounting
- `.env.example`: all optional and required variables documented
- a seed/reset command
- a validation command for content records and broken internal relations
- a QR export/generation command
- database migration, rollback/backup, and first-admin bootstrap commands
- an SSH release script with dry-run support and excluded secret/upload paths
- a production-readiness command or checklist script if practical
- GitHub Actions or equivalent CI for lint, types, tests, and build

The launch checklist must include at least:

- final event address and external map link;
- Eventbrite URL;
- official Newa Guthi logo and brand colours;
- final schedule and locations;
- venue map/measurements and accessibility routes;
- approved English cultural copy and named approver;
- approved Nepali and Nepal Bhasa translations;
- pronunciation/audio/video rights;
- all vendor/sponsor names, tiers, logos, links, stall numbers, dietary details;
- membership URL, 25% offer code, terms, start/end time;
- newsletter provider/list and consent wording;
- classes and volunteer links;
- event contact and emergency procedures;
- organiser user list and roles;
- Hostinger plan capabilities, SSH path, subdomain document root, PHP version/extensions, MySQL database name/user, and production secret configuration;
- analytics choice and consent/privacy review;
- AI provider/credentials, approved knowledge set, limits, and final enablement decision;
- domain DNS and TLS;
- QR print proof and on-site scan test;
- content freeze, rehearsal, backup operator, and rollback plan.

---

## 19. Acceptance criteria

The application is implementation-complete when:

- A new developer can clone, install, and run it from the README without external credentials
- The entire visitor experience works with seed data
- It is installable as a PWA on supported devices
- The schedule correctly calculates and displays live, next, delayed, moved, completed, and cancelled activities
- All Cultural Trail QR routes work and persist anonymous passport progress
- The map works visually and as an accessible text list
- Saved activities persist and calendar downloads are valid
- Directory filters and show-on-map links work
- English is complete and other locales fall back safely
- Admin demo functionality demonstrates event-day operations
- Production admin mutations are authenticated, CSRF-protected, and authorised when API mode is enabled
- Offline states never imply cached data is live
- AI is off by default and cannot answer from unapproved general knowledge when enabled
- Automated checks pass
- The frontend builds into static production assets and the PHP backend installs cleanly with production Composer dependencies
- No secret, personal attendee data, or falsely approved cultural content is committed
- Remaining launch work is explicitly captured in the checklist rather than hidden in code comments

---

## 20. Explicit non-goals for this release

- Native iOS or Android application
- General-purpose event management SaaS
- Full e-commerce or stall ordering
- Accurate GPS/indoor navigation
- Complex attendee accounts and password management
- Building a replacement for Eventbrite
- Publishing unreviewed AI-generated cultural history
- Collecting unnecessary visitor personal data
- Depending on push notifications for essential operational communication

---

## 21. Agent working rules

The local coding agent must:

1. Read this entire file before making changes.
2. Inspect any existing repository and preserve user work.
3. Create a concise implementation plan and maintain progress in the session.
4. Choose sensible defaults and proceed without asking routine preference questions.
5. Never wait for credentials; implement and test an adapter plus mock/seed mode.
6. Never silently reduce scope. If something cannot be completed, document the exact blocker and leave a working fallback.
7. Keep commits logically grouped if the environment permits commits; never overwrite unrelated changes.
8. Use accessible, production-quality components rather than a throwaway prototype.
9. Test actual user flows, not only compilation.
10. At completion, provide commands run, checks passed, remaining content/credential tasks, and deployment instructions.

---

## 22. Ready-to-paste initial prompt for local Codex

Paste the following into Codex from the repository root:

```text
Read INDRA_JATRA_APP_CODEX_HANDOFF.md completely. Treat it as the authoritative product and engineering specification.

Build the full Indra Jatra Melbourne 2026 mobile-first PWA described in that file. First inspect the repository and preserve any existing work. Then create and maintain an implementation plan, implement the app phase by phase, and continue autonomously until the launch-ready P0 and P1 scope is complete.

Do not pause for routine questions. Make reasonable, documented decisions. If credentials, final assets, final cultural copy, translations, timetable details, map coordinates, or external URLs are missing, implement a typed adapter and polished seed/demo fallback, record the missing production input in docs/CONTENT_AND_LAUNCH_CHECKLIST.md, and continue. Do not fabricate approved cultural facts or production data.

Use strict TypeScript, accessible responsive UI, the seed/PHP-API repository boundary, automated tests, an installable and safe offline PWA, a versioned MySQL schema, and a safe Hostinger SSH deployment workflow. Run and fix lint, typecheck, frontend and backend tests, end-to-end smoke tests, and the production build. Do not declare completion while those checks fail.

At the end, give me:
1. a concise summary of what was built;
2. the exact local run commands;
3. all validation commands and their results;
4. the production configuration still required;
5. the safest next deployment step.
```

### Suggested local start

```bash
mkdir indra-jatra-pwa
cd indra-jatra-pwa
git init
# Copy this file into the directory, then open the directory in Codex.
```

If code already exists, do not create a second nested application. Have Codex inspect it and integrate the specification into the existing repository.

---

## 23. Product-owner notes for final review

The following are known intentions, not automatically approved production facts:

- The event is free and uses Eventbrite registration.
- The organiser expects more than 10,000 attendees.
- The proposed event companion domain is `indrajatra.newaguthi.org.au`.
- The intended festival membership promotion is 25% off; exact terms remain to be supplied.
- Newa Guthi runs Dhimey and flute classes and wants newsletter/member/volunteer conversion.
- The Digital Cultural Trail is expected to cover Indra Statue, Swet Bhairab, two chariots, Lakhey, Kumari, Pulukisi, Dhimey, flute, Samay Baji, the Newa Guthi station, and a stage/Yenya story point.
- Swet Bhairab content may include the timing of Hatha Hayekegu. Public copy and operational/safety wording must be culturally and organisationally approved before publication.
- Live timings may change; organiser controls and visibly updated timestamps are essential.

The product owner should review the generated seed site early on a phone, then prioritise supplying the final map, timetable, cultural copy, QR sign placement, and emergency information. Those five inputs most directly affect the on-site experience.
