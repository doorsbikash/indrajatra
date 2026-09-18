# Ship checklist — Saturday 26 September 2026

Honest status. Everything under "Done" is built and tested. Everything under
"Before the day" is real work someone has to do.

---

## Done

- [x] Visitor app opens with no sign-in wall; sign-in offered only where it buys something
- [x] Real event details throughout — date, venue, full address, free entry, contacts
- [x] 15-item programme, grouped by hour, filterable, saveable, calendar export
- [x] Live Now / Next / Later driven by a single clock, with a rehearsal mode
- [x] 12 cultural trail stops with written, checked content and real 2025 photography
- [x] QR scan → stamp → passport → completion badge, working end to end
- [x] Printable A4 trail signage generated from the content (`npm run export:qr`)
- [x] Site map with every location from the planned site map, filters, directions, access notes
- [x] Confirmed 2026 stallholders from the EOI responses
- [x] Emergency, first aid, lost children, accessibility, parking, quiet space, FAQs
- [x] Organiser console: start / delay / complete / cancel, publish announcements, live to visitors
- [x] Organiser can edit the run sheet — times, titles, copy, place, tags, add and remove items
- [x] Organiser can paste the committee run sheet in whole, with a preview of what was read
- [x] Organiser can swap the hero and any trail photo from the phone, resized in the browser
- [x] Organiser state exports and imports as one JSON file, and as a paste-ready `data.ts` block
- [x] Privacy panel showing exactly what is stored, with one-tap clear
- [x] PWA: installable, offline-capable, full icon set
- [x] Design system in tokens; 320px → desktop; reduced-motion respected
- [x] `npm run check` green: content validation, typecheck, lint, 34 tests, production build

---

## Before the day — blocking

**Content sign-off** (cultural committee)
- [ ] Approve each of the 12 trail stories. Change that stop's `reviewStatus` to
      `"approved"` in `frontend/src/content/seed/data.ts` and the pending note disappears.
- [ ] Replace the draft run sheet with the committee's final one (`scheduleRows`).
      It is one table — times, titles, locations, blurbs.
- [ ] Confirm the emergency and first aid details read correctly to whoever is
      actually staffing them on the day.

**Operational**
- [ ] Print and laminate the 12 trail signs. Spring, outdoors, one day — sleeve them.
- [ ] Walk the site and check every marker sits where the thing actually is.
      The map is the *planned* layout; things move on setup day.
- [ ] Decide who holds the organiser console and on what device. Brief them.
- [ ] Rehearse the run sheet on the demo clock with that person, Friday.

**Technical**
- [ ] Deploy to the live domain and confirm QR codes point at it
      (`npm run export:qr -- --base https://<live-domain>` if it differs).
- [ ] Re-print signs if the domain changed.
- [ ] Test on a real phone at the venue. Diggers Rest reception is not Melbourne CBD —
      load the app on site, then put the phone in aeroplane mode and confirm it still works.

---

## Before public launch — not blocking the demo

- [ ] **Put the organiser console behind authentication.** It is currently open to
      anyone who knows the URL. It needs the PHP session login, CSRF protection and an
      organiser role check before the app is public. This is the one genuine security
      gap and it is flagged in the console itself.
- [ ] Wire the PHP API: `/api/public-data` plus the five auth endpoints, then set
      `VITE_DATA_PROVIDER=api`. The frontend needs no other change.
- [ ] Move organiser overrides from the browser to the server, so a change made on the
      MC's phone reaches a visitor's phone rather than only other tabs on that device.
      This is the single biggest functional gap between the demo and the real thing.
      `liveStore` is already the only thing that touches storage — replace its read and
      write pair with `GET /api/live` and `POST /api/admin/live` and nothing else in the
      app changes. Until then, one person drives the console and the JSON export moves
      the state to a backup phone.
- [ ] Photo uploads to the server, so a photo taken on the day reaches every phone and
      survives past that browser. Today they are held as resized data URLs in the one
      browser, inside a 3.4MB budget with a meter on the Photos tab.
- [ ] Real email delivery for the six-digit sign-in code (currently `260926` in demo mode).

---

## Nice to have, if there is time

- [ ] Nepali and Nepal Bhasa translations. The data model and the language switcher
      already support them — every string is `{ en, ne?, new? }`. It is a translation
      job, not a code job.
- [ ] Photography for the six trail stops that currently use a patterned card instead
      of an image: Indra, Swet Bhairab, Dhimey, Bansuri, Samay Baji.
      Shoot them on the day for next year.
- [ ] Confirmed sponsor logos in the directory.
- [ ] Push notifications for schedule changes (flagged off; needs the server first).
- [ ] "Ask Yenya" AI guide (flagged off; needs approved cultural content and credentials).

---

## Known limitations, stated plainly

- Organiser changes — run state, run sheet edits and photos alike — propagate across
  **tabs on one device**, not between devices. Cross-device needs the server. For the
  demo this is invisible; on the day it means one person drives the console, and the
  JSON export is how you get the state onto a second phone.
- Run sheet edits and photo swaps are overrides, not published content. They survive a
  refresh and a reinstall of the app, but not a cleared browser. Use **Copy data.ts
  block** to make a run sheet permanent.
- The map is a static image with placed markers, not GPS. Deliberate — GPS on an open
  field with no landmarks is worse than a clear diagram.
- The membership offer links to the website; there is no in-app payment.
- Analytics is a local allow-list that logs to the console in dev and nothing in
  production, until a server endpoint exists to receive it.
