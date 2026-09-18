# Celebrate Only Newly Earned Stamps

## Metadata

- **Priority:** LOW
- **Scope:** `frontend/src/pages/TrailPoint.tsx`, `frontend/src/styles/app.css`
- **Audit source:** 2026-09-18 motion review

## Observation

Stamp motion should mark a meaningful state change, but collected stamps can animate again whenever their view mounts. Large spring scaling also makes the content feel less physical than a stamped passport.

## Implementation

1. Pass a transient `justCollected` state only after a successful scan or collection action.
2. Apply a `.stamp--new` class to that one stamp. Persist collection separately, but do not persist the animation flag.
3. Animate opacity plus scale from `.94` to `1` for 220ms using `cubic-bezier(0.23, 1, 0.32, 1)`.
4. Add a short 100ms press response to the collect action before success, then run the stamp reveal.
5. Announce collection through the existing live region/toast. Motion must not be the only success signal.

## Reduced Motion

Use an opacity-only transition for the newly collected stamp. Existing collected stamps render immediately.

## Acceptance Criteria

- Only the stamp earned by the current action animates.
- Revisiting a collected trail stop does not replay the celebration.
- Success is communicated by visible text and an accessible announcement.

## Verification

- Collect one stop, navigate away, and return.
- Reload the app and verify the stamp remains without replaying.
- Repeat in reduced-motion mode.
