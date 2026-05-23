# Plan 20 — Paragraph Reflow, Independent Layers, Reset/History Fixes

## Context

The editor already has a scoped reflow engine, linked-layer overrides, and session-scoped history. What is still missing is true paragraph-style editing behavior: text should flow back into empty space, Enter should push overflow forward, Backspace should collapse line breaks upward, and Arabic/Bangla layers should move independently unless the link toggles explicitly fan out the change.

This plan keeps the existing architecture and extends the current reflow / history / reset pipeline instead of introducing a second editor model.

## Recommended split

### 20A — Core reflow semantics
Focus on inline editing, line-break behavior, and overflow planning.

### 20B — Staged apply + history/reset fixes
Focus on large-change confirmation, loading/progress, independent layer movement, and session-scoped undo/reset behavior.

---

## 20A — Core reflow semantics

### Goals
- Inline Arabic/Bangla editing behaves like paragraph text, not fixed lines.
- Empty space created by edits is backfilled by later words.
- Enter pushes overflow into following lines/pages according to the active scope.
- Backspace removes a line break and pulls words upward again.
- Cross-page / cross-surah spill still uses the existing confirm dialog path.

### Files to update
- [src/components/studio/FabricLines.tsx](src/components/studio/FabricLines.tsx)
- [src/lib/textReflow.ts](src/lib/textReflow.ts)
- [src/lib/typographyReflow.ts](src/lib/typographyReflow.ts)
- [src/lib/reflowScope.ts](src/lib/reflowScope.ts)
- [src/state/editorStore.ts](src/state/editorStore.ts)
- [src/state/reflowStore.ts](src/state/reflowStore.ts)

### Existing functions to reuse
- `InlineTextEditor.handleKeyDown`
- `InlineTextEditor.checkOverflow`
- `InlineTextEditor.getReflowBase`
- `getTextAroundCursor()`
- `planCascade()`
- `reflowLayerText()`
- `reflowFromAsync()`
- `backFillFrom()`
- `splitToFitForLayer()`
- `effectiveReflowScope()`
- `patchTypographyScoped()`
- `countTypographyTargets()`

### Implementation shape
1. Keep cursor-splitting on Enter via `getTextAroundCursor()`.
2. Add a reverse-flow helper in `textReflow.ts` so Backspace can collapse a line break and pull text upward.
3. Keep `planCascade()` as the dry-run that decides whether the edit crosses page or surah boundaries.
4. Keep `reflowLayerText()` as the single reflow entry point for scope-aware typing/typography edits.
5. Keep `reflowFromAsync()` + `backFillFrom()` for chunked forward/backward propagation.
6. Use `effectiveReflowScope()` as the only scope resolver for text cascade boundaries.
7. When the dry-run detects page/surah spill, set `editorStore.pendingReflow` and let the existing confirm dialog own the accept/cancel step.
8. Make Arabic and Bangla movement paths independent in the row renderer; link toggles should be the only reason a change fans out.

### Notes
- Avoid adding a second text model or a second cascade pipeline.
- Preserve cursor/selection after every inline mutation.
- Keep symbol layers out of text reflow.

---

## 20B — Staged apply + history/reset fixes

### Goals
- Large edits should stage locally, warn, then apply with loading/progress.
- Reset should work reliably from the current scope and current editor session.
- Undo/redo and visible history should remain session-bound.
- The “সব রিসেট করুন” path should clear staged changes and rebuild cleanly.

### Files to update
- [src/state/overridesStore.ts](src/state/overridesStore.ts)
- [src/components/studio/ScopeImpactWarningDialog.tsx](src/components/studio/ScopeImpactWarningDialog.tsx)
- [src/components/studio/CrossPageReflowDialog.tsx](src/components/studio/CrossPageReflowDialog.tsx)
- [src/hooks/useLargeChangeGuard.ts](src/hooks/useLargeChangeGuard.ts)
- [src/components/studio/PropertiesPanel.tsx](src/components/studio/PropertiesPanel.tsx)
- [src/components/studio/CanvasToolbar.tsx](src/components/studio/CanvasToolbar.tsx)
- [src/state/historyStore.ts](src/state/historyStore.ts)
- [src/components/studio/Workspace.tsx](src/components/studio/Workspace.tsx)

### Existing functions to reuse
- `patchLocal()`
- `patchScoped()`
- `getScopedLayerKeys()`
- `effectiveScope()`
- `effectiveScopeForRow()`
- `resetScoped()`
- `resetToSessionBaseline()`
- `captureSessionBaseline()`
- `markSessionStart()`
- `sessionEntries()`
- `restoreTo()`
- `useLargeChangeGuard()`

### Implementation shape
1. Keep large edits behind `useLargeChangeGuard()` so the existing warning/progress UI remains the staging surface.
2. Keep `pendingReflow` for cross-page / cross-surah edits and reuse `CrossPageReflowDialog`.
3. Keep `patchScoped()` and `effectiveScope()` as the only fan-out gate for linked changes.
4. Make layer movement independent by default; fan-out should happen only when the corresponding link switch is on.
5. Fix `ResetGroup` so `সব রিসেট করুন` clears the active scope correctly, clears staged state, and rebuilds from the right baseline.
6. Verify that the history dropdown and top-bar undo/redo only expose the current session.
7. Ensure the session boundary is re-established when the editor opens so older entries do not leak into the active stack.

### Notes
- Do not bypass `patchScoped()` with ad hoc fan-out logic.
- Do not use browser `confirm()`; keep the existing dialog components.
- Treat reset/history behavior as session-scoped state, not global app state.

---

## Verification

### Automated
- `npx tsc --noEmit`
- `npm run build`
- `node scripts/verify-editor.mjs`
- `node scripts/verify-reflow.mjs`

### Manual UI checks
- Edit Arabic and Bangla text in one row; confirm later words backfill into the empty space.
- Press Enter repeatedly; confirm overflow flows to the next line/page when needed.
- Press Backspace at a line start; confirm the line break collapses and words pull upward.
- Move Arabic and Bangla layers separately; confirm they do not drag together unless linked.
- Trigger a large edit; confirm the warning dialog, loading state, and chunked apply path.
- Use `সব রিসেট করুন`, undo/redo, and history restore after reopening the editor; confirm session isolation.

## Handoff note

Plan 19 remains the active plan in the master handoff until it is completed. This plan is staged so the next working agent can pick it up immediately after the current plan finishes.
