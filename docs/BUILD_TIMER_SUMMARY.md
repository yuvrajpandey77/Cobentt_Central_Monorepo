## Build Timer Implementation Summary

### What it does
- Displays a subtle status + elapsed time indicator while a build is in progress, and shows “Ready” when not building.
- Visuals: circular progress ring with color changes over time, status text, and a mm:ss timer.

### Where it lives
- UI component: `src/components/ui/build-timer.tsx`
- Used in: `src/modules/projects/ui/components/messages-container.tsx`

### How it works (lifecycle and logic)
- Initializes a stable start timestamp once using `useState(() => Date.now())`.
- When `isBuilding` is true, starts a `setInterval` that updates `elapsedMs` every second.
- Effect cleanup clears the interval on dependency changes and on unmount.
- Formats elapsed time to `m:ss`.
- Computes an approximate progress percentage with a soft cap at 99% while building, and 100% when ready.
- Derives status text and color based on elapsed time segments.

### Usage trigger
- In `MessagesContainer`, `isBuilding` is computed as:
  - true if the last message is from the user, or there is an active fragment without a `sandboxUrl`.
  - false otherwise (timer then shows “Ready”).

### Memory leak and error review
- Interval lifecycle:
  - The `useEffect` registers an interval only when `isBuilding` is true.
  - React runs the previous effect’s cleanup before applying new dependencies, so toggling `isBuilding` to false will clear the prior interval.
  - On unmount, the cleanup runs and clears any active interval.
  - Conclusion: no interval leak.
- Dependencies:
  - Effect depends on `[isBuilding, startTs]`. `startTs` is stable (set once), and `isBuilding` toggles re-run the effect correctly.
  - `useMemo` depends on `[elapsedMs, isBuilding]` and is pure; no side effects.
- Rendering:
  - SVG `strokeDasharray` uses a bounded percentage and smooth transition; no invalid attributes.
- Accessibility:
  - Status text is visible; the progress SVG is marked `aria-hidden` and paired with visible text, which is acceptable.

### Potential enhancements (non-blocking)
- Pause interval when the tab is hidden to reduce background CPU (Page Visibility API), if desired.
- Provide `aria-live="polite"` on the status text if we want assistive tech to announce status changes.

### Verdict
- The current implementation is correct, performant for this use case, and does not introduce a memory leak or obvious runtime errors.


