# Calm Bottom Navigation

## Metadata

- **Priority:** MEDIUM
- **Scope:** `frontend/src/styles/app.css`
- **Audit source:** 2026-09-18 motion review

## Observation

Every route change remounts an active indicator that grows from 40% size:

```css
.bottom-nav a.active::before {
  animation: navPop var(--t-base) var(--ease-spring);
}
@keyframes navPop {
  from { transform: scale(.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

This is a high-frequency navigation surface. Repeated popping competes with the page content and makes the bar feel less anchored.

## Implementation

1. Remove `navPop` and its keyframes.
2. Keep the existing 140ms color transition.
3. Reduce icon movement to `translateY(-1px)` and transition it for 140ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
4. Render the active background immediately. If continuity is desired later, use a shared indicator element that moves between fixed tab positions; do not recreate a scale animation on each tab.

## Reduced Motion

Keep the active color/background change. Disable the icon translation.

## Acceptance Criteria

- Route changes provide immediate location feedback without a pop animation.
- Repeatedly switching tabs does not draw attention away from page headings.
- The nav dimensions remain fixed throughout interaction.

## Verification

- Tap through all five tabs quickly on a 390 x 844 viewport.
- Confirm the active indicator is visible immediately after navigation.
- Confirm reduced-motion mode retains a clear selected state.
