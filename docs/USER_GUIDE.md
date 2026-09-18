# Indra Jatra App — User Guide
## 1. Start the app locally

1. Open Terminal.
2. Run `cd "/Users/insitedev8/Documents/bikash/Newa Guthi/IndraJatra App"`.
3. Run `npm install` after dependency changes.
4. Run `npm run check` and confirm every command passes.
5. Run `npm run dev`.
6. Open the Local URL on the computer. Use the Network URL on a phone connected to the same Wi-Fi.

## 2. Visitor home

1. Open Home to see the festival date, venue and what is happening now.
2. Use **What's on**, **Map**, **Trail**, **Mine** or the Help link.
3. The Preview banner appears before event day. Organisers use it for rehearsal; visitors should see real time on event day.

## 3. Programme

1. Open **What's on**.
2. Filter by stage, procession, culture, music, family or food.
3. Tap **Save** to add an activity to My Festival.
4. Tap **Calendar** to download an `.ics` calendar entry.
5. Open **Mine** to review saved activities and download the complete itinerary.

## 4. Cultural trail and QR signs

1. Open **Trail** to browse all 12 stories.
2. At the venue, scan a printed QR sign with the phone camera.
3. A valid code collects that stop's stamp and opens its story.
4. Read the story, why it matters and what to look for.
5. Use **Show on map** to find the related display.
6. Complete all stops to unlock the completion state and membership offer.

## 5. Venue map

1. Open **Map**.
2. Use filters to narrow the markers.
3. Tap a numbered marker or a location in the text list.
4. Read the description, access note and walking directions.
5. Use the external map link for driving directions to ANMC.

## 6. Help and safety

1. Open **Help & safety**.
2. For life-threatening emergencies, call `000` and read the full venue address shown in the app.
3. Use the cards for first aid, lost children, toilets, parking, accessibility and the quiet space.
4. Open an FAQ for further practical information.

## 7. My Festival and sign-in

1. Open **Mine** to see saved activities and trail progress.
2. Create a festival pass when the app requests one for an account-linked action.
3. In seed/demo mode, use code `260926`.
4. In production, the code must arrive by email and expire after one use.
5. Use **Clear my data** to erase local saves and trail progress.
6. Use **Sign out** to end the account session.

## 8. Install on a phone

### Android / supported Chromium browser

1. Open the live HTTPS app.
2. Tap the app's **Install** button when available, or the browser menu's **Install app** action.
3. Confirm the native installation prompt.

### iPhone / iPad

1. Open the live HTTPS app in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

Apple does not provide a true one-tap web installation API. The app should show these instructions when no native prompt exists.

## 9. Organiser rehearsal

1. Do not expose `/organiser` publicly until server authentication is complete.
2. In a private demo, open `/organiser` and Home in two tabs in the same browser profile.
3. Move the demo clock to the required time.
4. Start, delay, complete or cancel an activity.
5. Publish a non-emergency announcement and verify it on Home.
6. Test emergency publishing only in rehearsal, then reset all overrides.

## 10. Update content

1. Edit `frontend/src/content/seed/data.ts`.
2. Keep IDs stable after QR signs are printed.
3. Add images under `frontend/public/images/` and use root-relative paths.
4. Run `npm run validate:content`.
5. Run `npm run check`.
6. Test the changed route on a phone and desktop.

## 11. Generate QR signs

1. Confirm the final live domain.
2. Run `npm run export:qr -- --base https://your-live-domain`.
3. Open `docs/qr/trail-signs.html` and inspect all pages.
4. Print one proof and scan every QR code with iPhone and Android before printing the full set.

## 12. Release procedure

1. Close every blocking item in `docs/SHIP_CHECKLIST.md` and `docs/QA_REPORT_2026-09-18.md`.
2. Back up the current site and database.
3. Run `npm run check`.
4. Build with `npm run build`.
5. Upload `frontend/dist/` to the dedicated Indra Jatra subdomain document root.
6. Deploy the PHP API only after secrets, database migrations and organiser authentication are ready.
7. Test HTTPS, deep links, offline launch, install, forms and organiser permissions on production.
8. Keep the previous release available for rollback.
