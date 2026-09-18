# Architecture

The visitor PWA is a static Vite/React application that can run entirely from `SeedRepository` for local demonstration. `ApiRepository` is the same-origin boundary for production PHP/MySQL data under `/api`.

The frontend keeps visitor state in local storage only: saved schedule items, discovered trail stops, selected language, and last scanned location. No account is required for normal visitors.

Production dynamic operations should use PHP 8.2+, PDO, secure sessions, CSRF protection, role checks, audit entries, and idempotent migrations. Seed/demo admin controls are intentionally labelled as non-production.
