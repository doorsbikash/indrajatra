#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_ID="${1:-$(date -u +%Y%m%d%H%M%S)}"
RELEASE_DIR="$ROOT_DIR/build/releases/$RELEASE_ID"

cd "$ROOT_DIR"
VITE_DATA_PROVIDER=seed VITE_AUTH_PROVIDER=api npm run build

mkdir -p "$RELEASE_DIR/public/api" "$RELEASE_DIR/backend"
rsync -a --delete frontend/dist/ "$RELEASE_DIR/public/"
cp deploy/.htaccess "$RELEASE_DIR/public/.htaccess"
rsync -a backend/public/ "$RELEASE_DIR/public/api/"
rsync -a backend/src backend/database backend/composer.json "$RELEASE_DIR/backend/"
cp deploy/app.env.example "$RELEASE_DIR/app.env.example"

printf 'Release prepared: %s\n' "$RELEASE_DIR"
printf 'Public document root: %s\n' "$RELEASE_DIR/public"
printf 'Create config/app.env on the server before switching the document root.\n'
