#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"
VITE_DATA_PROVIDER=seed \
VITE_AUTH_PROVIDER=api \
VITE_ENABLE_ORGANISER=true \
VITE_ROBOTS="index, follow" \
VITE_SITE_URL="https://indrajatra.newaguthi.org.au" \
npm run build
cp deploy/robots.production.txt frontend/dist/robots.txt

printf 'Production build prepared in: %s/frontend/dist\n' "$ROOT_DIR"
