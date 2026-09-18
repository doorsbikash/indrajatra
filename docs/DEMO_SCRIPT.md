# Demo script — Indra Jatra Melbourne 2026 app

Twelve minutes, phone first. Written to be read off a second screen while you drive.

**Before you start**

```bash
npm install          # only if you haven't since the handover
npm run check        # everything green? good
npm run dev
```

Open the app on a phone on the same wifi (the dev server prints the network URL), or
in Chrome with device emulation at 390 × 844. Have a **second tab open on
`/organiser`** — you'll need it at minute 9.

If you have demoed before on this device, clear it first: **My Festival → Clear my
data**, and **Reset all** on the organiser screen. Otherwise you'll open on a
half-finished passport.

---

## 1 · The problem, in one line (30 sec)

> "Three thousand people walk onto a field at Diggers Rest and have no idea what's
> happening, when, or what they're looking at. Last year we answered that with a
> printed program and people shouting from the stage."

---

## 2 · Open the app (1 min)

Land on Home. Don't scroll yet.

- **No login.** Point this out explicitly — this is the single biggest change.
  The old build asked for a name, email, phone and a six-digit code before showing
  anything. On patchy 4G, in a queue, that loses most of the crowd.
- The hero says what it is, when, where, and that it's free.
- Top bar says **Preview — showing Saturday 26 September, 11:42 am**. Explain that
  this is a rehearsal clock; on the day it uses the real time automatically and the
  bar disappears. It means we can demo the live experience any day of the year.

## 3 · What's on right now (1.5 min)

Scroll to **On right now**.

- The card is live, with a green pulse. Below it, "Then" with a countdown, then the
  rest of the afternoon.
- Tap **Save** on something — toast confirms, and it's now in My Festival. No account
  needed for that.
- Tap **Calendar** — a real .ics lands in downloads.

Go to **What's on**. Filter chips with counts; the day is grouped by hour so it reads
like a run sheet rather than a wall of text.

> Say: "These fifteen items are a realistic draft built from the sponsorship proposal.
> The committee's final run sheet drops into one table in the content file."

## 4 · The cultural trail — the bit that isn't a program guide (3 min)

Tap **Trail**.

- Twelve stops, twelve stamps. Explain the loop: numbered sign on the field → phone
  camera → story → stamp.
- Open **Lakhey**. Real photo from our own 2025 festival. Native script, pronunciation,
  the story, "why it matters", "what to look for", and a link to where it is on the map.
- Scroll to the bottom: the small note saying the story is written and checked but
  awaiting cultural committee sign-off. **This is deliberate** — it tells the committee
  exactly what they still own, and it disappears per-stop as they sign each one off.

Now show the scan itself. In the address bar go to **`/scan/pulukisi`**.

- Green tick, "Stamp 7 collected", auto-opens the story.
- Go back to **Trail** — the stamp is filled, progress has moved, and the bottom nav
  has a badge.

> Say: "The signs are already generated. `npm run export:qr` gives us twelve
> print-ready A4 pages with real QR codes — that's a print job, not a dev job."

Show `docs/qr/trail-signs.html` if you have a laptop screen free.

## 5 · The map (1.5 min)

Tap **Map**.

- This is **our actual planned site map**, not a sketch. Every marker is placed on it.
- Filter to **Toilets & help** — the question people actually ask.
- Tap **First Aid**: what it is, walking directions from the guest entry, and an
  accessibility note specific to that spot.
- Scroll down: the same information as a text list, for anyone who can't use the map.

## 6 · Practical stuff (1 min)

Tap **Help & safety**.

- Emergency card first, in red, with a one-tap **Call 000** that includes the full
  address to read to the operator.
- Then first aid, lost children, accessibility, parking, quiet space — and the FAQs.

## 7 · The conversion (1 min)

Tap **Mine**, then **Your member offer**.

- Finish the trail → unlock the membership offer. The trail isn't a gimmick; it's the
  funnel. Twelve stops of genuine cultural content, ending at "join the Guthi".
- Weekly classes, volunteering, what membership actually pays for.

Back on **My Festival**, scroll to **Your privacy**: exactly what's stored, how much of
it, and one button to wipe it. Worth calling out to the committee — we collect nothing
we don't need.

## 8 · Running the day (2.5 min) — the finale

Switch to the **`/organiser`** tab. Keep the phone visible.

1. Find **Kumari Rath Yatra** → tap **Start**.
   → Switch to the phone, go Home. It's live, with the original time struck through.
2. Back on organiser: **+10 min** on **Pulukisi**.
   → Phone shows "Delayed 10 min" and the new time.
3. Publish the announcement **"Anyone can pull the chariot"**.
   → It appears on the phone's home screen.

> Say: "No refresh, no app store update, no developer. Whoever is on the mic can do
> this from their phone at the Media Station."

Show the **demo clock** slider — drag it across the day and watch the programme move
through it. That's how we rehearse on Friday.

### The bit the committee will care about most

Tap the **Run sheet** tab.

4. Paste three lines into **Paste the committee run sheet** — any format, e.g.

   ```
   10:00 - 10:20 | Gates open | guest-entry | community
   10:20  10:45  Dhimey Baja welcome  guest-entry  procession, music
   1:15pm | Lakhey dance | main-stage | culture
   ```

   Tap **Check it**. It shows what it read and flags anything it couldn't.
   Tap **Replace the programme** → the phone's What's On rebuilds itself.
5. Change one item's start time with the time picker → the phone follows.
6. Tap **Discard run sheet changes** to put the published programme back.

Then tap the **Photos** tab, pick a photo for any trail stop from the phone's camera
roll, and open that stop on the visitor screen.

> Say: "When the final run sheet lands, nobody has to wait for a developer. Paste it,
> check it, publish it. Same for photos taken on the morning."

Finish on **Reset all**.

---

## Questions you'll get, and the answers

**"Does it work without signal?"**
Yes. Everything — content, images, map — is cached when the app first opens. Add it to
the home screen and it launches offline. Live organiser updates need a connection; the
rest doesn't.

**"What if someone doesn't have a QR scanner?"**
Every phone camera from the last five years does it natively. And every stop is
readable from the Trail screen without scanning — the stamp is the only thing that
needs you to be standing there.

**"Is the cultural content right?"**
It's written and checked, and every stop carries a visible note asking the committee to
sign it off. Sign-off is per stop, so we can go live with some approved and some not.

**"Can we change the programme after we print?"**
That's the point of the organiser console. The printed program is fixed at the printer;
this isn't.

**"Can we update the run sheet and the photos ourselves?"**
Yes — Run sheet and Photos tabs, no developer involved. Two caveats, said plainly:
those changes live in the browser you made them in, so one person drives the console
on the day; and they are overrides, not published content. When a run sheet is final,
**Copy data.ts block** hands the developer a ready-to-paste block that bakes it in.
Server-side storage, so every phone sees the same thing, is on the launch list.

**"What's left before the day?"**
See `docs/SHIP_CHECKLIST.md` — the honest list.
