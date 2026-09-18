# Deployment Readiness - 18 September 2026

## Decision

**Internal demo: GO**
**Public production launch: NO-GO**

The visitor PWA builds and can be rehearsed on a local network. Public deployment is blocked by unauthenticated organiser controls, missing production API/auth endpoints, browser-only live updates, an incomplete installation flow, and unapproved cultural/run-sheet content.

## Demo Package

The static demo release is generated from `frontend/dist` and includes the Apache SPA/HTTPS rules from `deploy/.htaccess`. It is suitable for a private, access-controlled stakeholder test where organiser functions are understood to be demo-only.

The package does not provide:

- production email-code authentication;
- a shared database or cross-device organiser updates;
- protected organiser authorization;
- automatic iPhone installation;
- approved final festival content.

## Production Gate

Complete these items before uploading to a public document root:

1. Implement and test `/api/public-data` and all registration/login endpoints.
2. Require authenticated, authorized organiser access on both UI and API.
3. Move live programme/status updates from `localStorage`/`BroadcastChannel` to the server.
4. Confirm whether Login/Register remains the first interface, then implement the agreed onboarding flow.
5. Add install-prompt handling for supported Android browsers and guided iOS instructions.
6. Add explicit consent handling and a privacy-policy link for registration data and festival updates.
7. Approve every cultural story, final programme item, map label, contact number and emergency instruction.
8. Run iPhone and Android rehearsals on the final HTTPS domain.
9. Confirm Hostinger SSH host, user, document root, PHP version, database, secrets, backup and rollback path.

## Release Procedure

After the gate is complete:

```bash
npm run check
npm run build
composer install --no-dev --optimize-autoloader --working-dir backend
```

Back up the existing web root and database, deploy the API and static files to a versioned release directory, run migrations, switch the document root or symlink, then smoke-test every visitor and organiser route over HTTPS. Roll back by restoring the previous release and database snapshot.

## Acceptance Smoke Test

- Register with a Nepal Bhasa/Devanagari name and verify the email code.
- Sign in on a second phone and confirm profile/session behavior.
- Publish a programme change from the organiser console and see it on another device.
- Install on supported Android; follow the iOS Add to Home Screen guide.
- Open the installed app offline and confirm cached visitor content.
- Scan valid and invalid QR codes.
- Verify First Aid, toilets, entry/exit and accessibility information against the physical site.
- Submit sponsorship and other external forms and confirm receipt/notification.
