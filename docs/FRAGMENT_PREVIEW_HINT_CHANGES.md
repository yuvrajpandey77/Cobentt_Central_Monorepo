### Fragment Preview and Hint Integration – Change Summary

This document summarizes the latest UI updates related to the fragment preview pane and the new hint (tooltip) helper.

## What changed
- **Fragment preview pane added**: An embeddable sandbox preview with basic controls (refresh, copy URL, open in new tab).
- **Reusable hint component introduced**: Thin wrapper around the tooltip primitives to standardize tooltips.
- **Project view wired up**: Preview panel renders the active fragment selected from the messages list within a resizable split layout.

## Files modified/added
- `src/modules/projects/ui/components/fragment-web.tsx` (added): Implements the preview iframe and controls.
- `src/components/hint.tsx` (added): Provides the `Hint` tooltip wrapper used across controls.
- `src/modules/projects/ui/views/project-view.tsx` (modified): Integrates `FragmentWeb` into the right-hand resizable panel and manages `activeFragment` state.

## Details

### `FragmentWeb`
- **Props**: `data: Fragment` (from `@/generated/prisma`).
- **Controls**:
  - Refresh: re-mounts the iframe by incrementing a `fragmentKey` state.
  - Copy URL: copies `data.sandboxUrl` to clipboard; temporary visual state via `copied` flag.
  - Open in new tab: opens `data.sandboxUrl` in a new tab if available.
- **Preview**: Renders an iframe pointing to `data.sandboxUrl` with a safe `sandbox` attribute (`allow-scripts`, `allow-forms`, `allow-same-origin`).
- **UX**: All controls are annotated using `Hint` for consistent tooltips. Copy/Open are disabled when `sandboxUrl` is falsy; Copy also disables while `copied` is true.

### `Hint`
- **API**: `Hint({ children, text, side = "top", align = "center" })`.
- **Purpose**: Standardizes tooltip usage across the app using shadcn/Radix primitives.
- **Notes**: Component prop interface is named `HindProps` (cosmetic typo in name only); exported component is `Hint`.

### `ProjectView`
- **State**: `activeFragment` of type `Fragment | null`.
- **Layout**: Uses `ResizablePanelGroup` for a two-pane layout:
  - Left: `ProjectHeader` + `MessagesContainer` (where fragment selection happens).
  - Right: Conditionally renders `<FragmentWeb data={activeFragment} />` when a fragment is selected.
- **Loading**: Individual `Suspense` boundaries for header and messages.

## Behavioral overview
- Selecting a fragment from the messages list sets `activeFragment`.
- The right pane shows the corresponding sandbox preview.
- Users can refresh the iframe, copy its URL, or open it in a new tab; tooltips describe each action.

## Considerations & follow-ups
- Validate `sandboxUrl` shape and protocol before use; currently guarded only by truthiness checks.
- Optional: Provide visual feedback for copy success (e.g., icon/text change) beyond button disable timing.
- Optional: Persist last selected fragment per project (URL param or local state) to restore on reload.
- Optional: Error boundary around the iframe area for failed loads.

## Quick usage examples
- Add a tooltip to any control using `Hint`:

```tsx
<Hint text="Refresh" side="bottom" align="start">
  <Button variant="outline" size="sm" onClick={onRefresh}>
    <RefreshCcwIcon />
  </Button>
  </Hint>
```

- Render the preview when a `Fragment` is available:

```tsx
{!!activeFragment && <FragmentWeb data={activeFragment} />}
```


