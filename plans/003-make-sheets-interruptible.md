# Make Sheets Interruptible

## Metadata

- **Priority:** MEDIUM
- **Scope:** `frontend/src/components/ui.tsx`, `frontend/src/styles/app.css`
- **Audit source:** 2026-09-18 motion review

## Observation

The sheet uses entrance-only keyframes:

```css
.scrim { animation: fade var(--t-base) var(--ease-out); }
.sheet { animation: sheetUp var(--t-slow) var(--ease-out); }
```

Closing unmounts the dialog immediately, so there is no visual exit and rapid open/close interaction cannot reverse smoothly.

## Implementation

1. Give `Sheet` an internal `closing` state and expose it through `data-state="open|closing"` on the scrim.
2. Route Escape, backdrop click, and close-button actions through one `requestClose` function.
3. Use transitions rather than keyframes:

```css
.scrim {
  opacity: 1;
  transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1);
}
.sheet {
  transform: translateY(0);
  transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
}
.scrim[data-state="closing"] { opacity: 0; }
.scrim[data-state="closing"] .sheet { transform: translateY(100%); }
```

4. Call the parent `onClose` after the exit transition finishes. Guard against duplicate calls.
5. Preserve the desktop scale/opacity treatment, but keep the same state lifecycle and a maximum 240ms duration.
6. As part of this component change, restore focus to the opener and add a focus trap; both are existing accessibility gaps in the same lifecycle.

## Reduced Motion

Set sheet transform duration to `0ms`, but retain a 100ms scrim opacity transition so state change remains legible.

## Acceptance Criteria

- Open and close each sheet with trigger, Escape, close button, and backdrop.
- Focus stays in the dialog and returns to the trigger on close.
- Rapid dismissal never leaves body scroll locked.
- No sheet remains mounted after its exit completes.

## Verification

- Add component tests using fake timers for the close lifecycle.
- Test at mobile and desktop breakpoints.
- Test with `prefers-reduced-motion: reduce`.
