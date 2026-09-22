# Indra Jatra — Yenya Punhi Melbourne 2026

The visitor companion app for the festival, and the organiser console used to run the day.

**Saturday 26 September 2026 · 9:00 am – 4:10 pm
Australian Nepalese Multicultural Centre, 100 Duncans Ln, Diggers Rest VIC 3427 · Free entry**

Presented by Newa Guthi Victoria.

---

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

One command runs every gate before you deploy:

```bash
npm run check          # content → types → lint → tests → production build
```

Individually:

| Command | What it does |
| --- | --- |
| `npm run validate:content` | Refuses to pass if any content is broken or still placeholder |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — schedule logic, organiser overrides, run sheet parsing, content integrity |
| `npm run build` | Production build into `frontend/dist` |
| `npm run export:qr` | Printable trail signage into `docs/qr/` |

---

## What the visitor gets

**No sign-in wall.** The app opens straight onto the festival. Saving an item or
collecting a trail stamp works immediately, stored on the device. A free pass is
offered only when it actually buys something — syncing across devices, and the
membership offer at the end of the trail.

- **Home** — a live band showing what is on right now, what's next, and what follows,
  plus a countdown before the day and announcements from the organisers.
- **Programme** — 15 items grouped by hour, filterable, saveable, with calendar export.
  Times update live when the organisers move something; a struck-through time means it moved.
- **Yenya Cultural Trail** — 12 stops with real cultural writing. Scan the QR on the
  numbered sign, collect a stamp, complete all twelve for the Yenya Explorer badge.
- **Site map** — every location from the organiser's planned site map, with filters for
  "toilets & help", "food & stalls", walking directions from the entry, and accessibility notes.
- **Food & stalls** — the confirmed 2026 stallholders.
- **Help & safety** — emergency, first aid, lost children, accessibility, parking,
  quiet space, and the questions people actually ask.
- **My Festival** — saved items, passport progress, and a plain-language privacy panel
  that shows exactly what is stored and clears it in one tap.

Offline: the app shell, all content and all images are precached. Once it has been
opened on the day it keeps working with no signal — which matters at Diggers Rest.

## What the organiser gets

`/organiser`, in three tabs.

**Run the day** — start an item, push it back ten minutes, mark it done, cancel it,
or publish an announcement. There is also a **demo clock** for rehearsing the day,
which switches itself off automatically on 26 September. Whenever it is on, visitors
see a "Preview" bar, so the app never quietly lies about the time.

**Run sheet** — edit any item's time, title, description, place, tags and highlight
flag; add items; take items off the programme and put them back. Or paste the
committee's run sheet in whole: one item per line, columns separated by tabs (straight
out of Excel or a Word table), pipes, or two or more spaces, with times written 10:00,
10.00, 1:15pm or as a range. The parser shows you what it read and which lines it
could not, before anything changes.

**Photos** — swap the home-screen hero or any trail stop photo. Pick a file and it is
resized to 1280px on the phone and held in the browser; nothing is uploaded anywhere.
Or point it at a path already in `public/images/`.

Every change lands on every visitor screen in the same browser instantly
(BroadcastChannel) and survives a refresh (localStorage).

Two escape hatches sit at the bottom of the Run sheet tab:

- **Download backup / Restore from file** — the whole organiser state as one JSON
  file, to carry it to a second phone or keep a copy before a big edit.
- **Copy data.ts block** — renders the current programme as the `scheduleRows`
  literal from `src/content/seed/data.ts`. Paste it over the existing block, run
  `npm run validate:content`, and today's run sheet ships with the next build.

> The console is **unauthenticated in demo mode**, and everything it changes lives in
> one browser — two organisers on two phones do not see each other's changes. Before
> public launch it must sit behind the PHP session login with CSRF protection and an
> organiser role check, with the overrides stored server-side.

---

## How it fits together

```
frontend/src/
  app/          App, router, Shell (app bar, bottom nav, preview bar)
  pages/        one file per screen
  components/   EventCard, Passport, Announcements, SignInSheet, ui primitives
  content/seed/ ALL festival content — the file the committee edits
  lib/
    clock/      one source of "now"; real on the day, simulated before it
    live/       organiser overrides, run sheet parser, image resizing
    storage/    everything the visitor does, on their device only
    dates/      schedule maths and formatting
    calendar/   .ics export
    repositories/  seed ⇄ API swap point
  styles/       tokens.css (the design system) + app.css
scripts/        content validation, QR signage export
docs/           architecture, deployment, admin guide, QR print guide
backend/        PHP API + MySQL schema (not yet wired up)
```

**Switching to the live API** is one environment variable. `VITE_DATA_PROVIDER=api`
makes `getRepository()` fetch `/api/public-data` and `auth` call the real endpoints.
No page or component knows the difference.

---

## Editing the content

Everything a visitor reads lives in **`frontend/src/content/seed/data.ts`**, in plain
arrays with comments. No CMS needed before the day.

- **Programme** — the `scheduleRows` table near the top: id, title, start, end,
  location, blurb, tags. This is the run sheet; swap it for the committee's final one.
- **Trail** — `trailRows`. Each stop has a teaser, the story, "why it matters" and
  "what to look for". All twelve are currently `reviewStatus: "reviewed"`, which shows
  a small "awaiting sign-off" note at the bottom of the stop. Change a stop to
  `"approved"` once the cultural committee has signed it and the note disappears.
- **Stalls** — `listings`, taken from the 2026 EOI responses.
- **Map** — `locationRows`. `mapX` / `mapY` are percentages of the site map image.
- **Practical info and FAQs** — `infoCards` and `faqs`.

Run `npm run validate:content` after any edit. It checks every cross-reference, catches
duplicate ids and QR codes, keeps markers on the map, and fails the build if placeholder
text ever creeps back in.

## Printing the trail signs

```bash
npm run export:qr
open docs/qr/trail-signs.html     # then Ctrl/Cmd+P → A4, margins None, backgrounds ON
```

Twelve print-ready A4 signs, plus a CSV and individual SVGs for the designers.
QR codes use error-correction level H so a scuffed or rained-on sign still scans.
Point them at a different domain with `npm run export:qr -- --base https://your-domain`.

---

## Design

`frontend/src/styles/tokens.css` is the single source of truth: sindoor red, marigold,
jade, and warm paper, on a 4px spacing scale. Type is Fraunces for display and Plus
Jakarta Sans for UI, with Noto Sans Devanagari for Nepali and Nepal Bhasa script.

Light theme only — this is a daytime outdoor event and screens need to survive
spring sun, not look good at midnight.

## Accessibility

Tap targets are 36px or larger (46px for primary actions), content reflows to 320px,
the map has a full text equivalent below it, every interactive element is reachable by
keyboard with a visible focus ring, and all animation is disabled under
`prefers-reduced-motion`. Accessibility notes are written per location, not as a
blanket statement.
