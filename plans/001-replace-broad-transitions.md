# Replace Broad Transitions

## Metadata

- **Priority:** HIGH
- **Scope:** `frontend/src/styles/app.css`, `frontend/src/styles/tokens.css`
- **Audit source:** 2026-09-18 motion review

## Observation

Two frequently used controls animate every changed property:

```css
.chip { transition: all var(--t-fast) var(--ease-out); }
.segmented button { transition: all var(--t-fast) var(--ease-out); }
```

`transition: all` can animate padding, dimensions, or other layout properties added later, making interactions feel unstable and increasing rendering work.

## Implementation

1. In `frontend/src/styles/tokens.css`, normalize the standard ease-out token to `cubic-bezier(0.23, 1, 0.32, 1)`.
2. Replace both broad declarations with explicit properties:

```css
transition:
  color 140ms var(--ease-out),
  background-color 140ms var(--ease-out),
  border-color 140ms var(--ease-out),
  box-shadow 140ms var(--ease-out);
```

3. Do not add transform animation to these controls. Their selected state is already communicated by color and elevation.

## Reduced Motion

Keep color changes enabled. Suppress only transform or spatial animation if those are introduced later.

## Acceptance Criteria

- No `transition: all` remains in application styles.
- Selecting a chip or segment does not shift surrounding layout.
- Chrome Performance shows no layout event caused by the state transition.

## Verification

- Toggle every schedule filter rapidly on a mobile viewport.
- Switch between Register and Sign in repeatedly.
- Run `rg -n "transition:\\s*all" frontend/src` and confirm no matches.
