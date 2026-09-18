#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---dry-run}"
: "${STAGING_SSH:?Set STAGING_SSH, for example user@host}"
: "${STAGING_ROOT:?Set STAGING_ROOT to a dedicated subdomain app directory outside WordPress}"

if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "Usage: STAGING_SSH=user@host STAGING_ROOT=/home/.../indra-jatra-staging $0 [--dry-run|--apply]" >&2
  exit 2
fi

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
"$ROOT_DIR/deploy/build-staging-release.sh" "$RELEASE_ID"
LOCAL_RELEASE="$ROOT_DIR/build/releases/$RELEASE_ID/"
REMOTE_RELEASE="$STAGING_ROOT/releases/$RELEASE_ID"
RSYNC_FLAGS=(-avz --delete)
[[ "$MODE" == "--dry-run" ]] && RSYNC_FLAGS+=(-n)

echo "Uploading $LOCAL_RELEASE to $STAGING_SSH:$REMOTE_RELEASE/"
if [[ "$MODE" == "--dry-run" ]]; then
  rsync "${RSYNC_FLAGS[@]}" "$LOCAL_RELEASE" "$STAGING_SSH:$REMOTE_RELEASE/"
  echo "Dry run complete. No files uploaded. Re-run with --apply after reviewing the paths."
  exit 0
fi

ssh "$STAGING_SSH" "mkdir -p '$REMOTE_RELEASE' '$STAGING_ROOT/shared/config'"
rsync "${RSYNC_FLAGS[@]}" "$LOCAL_RELEASE" "$STAGING_SSH:$REMOTE_RELEASE/"
ssh "$STAGING_SSH" "test -f '$STAGING_ROOT/shared/config/app.env' || { echo 'Missing $STAGING_ROOT/shared/config/app.env'; exit 1; }"
ssh "$STAGING_SSH" "ln -s '$STAGING_ROOT/shared/config' '$REMOTE_RELEASE/config' && cd '$REMOTE_RELEASE' && php backend/database/migrate.php"
ssh "$STAGING_SSH" "ln -sfn '$REMOTE_RELEASE' '$STAGING_ROOT/current'"

echo "Release uploaded and current symlink updated."
echo "Set the Hostinger subdomain document root to: $STAGING_ROOT/current/public"
