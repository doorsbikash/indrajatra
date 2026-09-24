# Architecture

The visitor PWA is a static Vite/React application that can run entirely from `SeedRepository` for local demonstration. `ApiRepository` is the same-origin boundary for production PHP/MySQL data under `/api`.

The frontend keeps personal festival state in local storage only: saved schedule items, discovered trail stops, selected language, and last scanned location. No account is required for normal visitors. First-party analytics use a random anonymous device ID and per-session ID to record visit counts and allow-listed feature interactions; names, email addresses, IP addresses, raw user agents and fingerprints are not stored in analytics tables.

Production dynamic operations should use PHP 8.2+, PDO, secure sessions, CSRF protection, role checks, audit entries, and idempotent migrations. Seed/demo admin controls are intentionally labelled as non-production.
