## Plan 12 — Cross-Page/Cross-Surah Reflow & Dynamic Linking

This plan upgrades the existing reflow/linking primitives into a full cascading text-flow system with an in-app confirmation gate, and makes the Linking switch propagate **all** edits (Type Tool + Move Tool) according to the active scope.

---

### Scope of work (4 files modified, 2 created)

```text
src/state/editorStore.ts         (modified — add pendingReflow gate state)
src/state/reflowStore.ts         (modified — add cascadeReflow + cross-page mechanics)
src/lib/textReflow.ts            (modified — cross-page generator that returns a "diff plan")
src/components/studio/FabricLines.tsx   (modified — intercept Enter/paste → guard dialog)
src/components/studio/CrossPageReflowDialog.tsx  (new — confirmation AlertDialog)
src/components/studio/PropertiesPanel.tsx (modified — linking now honoured in DSlider/LocalFields)
```

No new dependencies.

---

### Part A — Dynamic Linking propagation (Type + Move tools)

Today `patchScoped()` already fans out a patch to every layerKey matching the active scope. But several call-sites bypass it:

1. `LocalFields` (`dx`/`dy` numeric inputs) → calls `patchScoped` ✅ already correct.
2. `SubLayerPanel` Y-offset slider → already uses `patchScoped` ✅.
3. `DSlider` font/Y-offset sliders → already uses `patchScoped` ✅.
4. `InlineTextEditor.onSave` → calls `patchLocal` directly. Text overrides are intentionally NOT fanned out (different rows hold different text).

**New rule introduced by this plan:** the **Linking switch per sub-layer** (`useLinkingStore`) acts as a *gate* on scope. If Linking for the active layer is **OFF**, force scope = `general` for that edit even if the global scope picker shows `page`/`surah`/`global`. If **ON**, the scope picker value is respected.

Implementation: introduce one helper in `overridesStore.ts`:

```ts
export function effectiveScope(scope: SelectionScope, layer: "arabic"|"bangla"|"symbol"|null): SelectionScope {
  if (!layer) return scope;
  const linking = useLinkingStore.getState()[layer];
  return linking ? scope : "general";
}
```

Then `DSlider`, `LocalFields`, `SubLayerPanel`, and the new cascade dialog all call `patchScoped(key, patch, effectiveScope(scope, selection.layerKind))`. This is the single source of truth for "linking honours scope".

The Type Tool `InlineTextEditor` is **not** fanned out for `text`, but **structural changes** (Enter / overflow) ARE — that is Part B.

---

### Part B — Interactive line-break + cascading reflow

#### B.1 — Intercept Enter & paste in `InlineTextEditor`

Replace today's pure `onInput` handler with explicit key handling:

```ts
onKeyDown:
  - if e.key === "Enter": e.preventDefault(); requestLineBreak(cursorBefore, cursorAfter);
  - all other keys: default behaviour, then syncToStore.
onPaste:
  - e.preventDefault(); read text/plain; requestInsert(text);
```

`getTextAroundCursor()` already exists in `src/lib/textReflow.ts` and gives us `{before, after}` text strings.

#### B.2 — Cascade planner (pure function, `textReflow.ts`)

New function:

```ts
planCascade({
  pages: PageData[],            // current pages from reflowStore
  surahPageIds: string[],       // pages of the current surah (cascade boundary)
  startPageIdx, startRowIdx,
  layer: "arabic"|"bangla",
  newCurrentText: string,       // text the row should hold after the edit
  pushedText: string,           // text to flow into the NEXT row (may be "")
  fontFamily, fontSize, availableWidth,
}): {
  rowUpdates: Array<{ pageId, rowIndex, layer, text }>,
  crossesPage: boolean,
  crossesSurah: boolean,
  newPagesNeeded: number,       // # of synthetic pages tail-overflow forces
}
```

Algorithm (pure, no store writes):
1. Set `current row → newCurrentText`.
2. Carry = `pushedText`.
3. Walk forward row-by-row through the surah pages:
   - For each downstream row read its **effective** text (override `text` or original).
   - `combined = carry + " " + downstreamText`.
   - `splitToFit(combined, ...)` → row gets `fits`, carry = `overflow`.
   - Record the row update only if `fits !== downstreamText`.
4. Track `crossesPage` (any update outside startPage) and `crossesSurah` (any update on a page whose surah ≠ startSurah; we can look this up via `reflowStore.distribution`).
5. If `carry !== ""` after all rows, set `newPagesNeeded = Math.ceil(carry length / per-page capacity)` (best-effort estimate using `LINES_PER_PAGE`).

This planner does not mutate state — it returns the diff so the dialog can show "এই পরিবর্তন N টি পেজ প্রভাবিত করবে" and the user can cancel cleanly.

#### B.3 — `reflowStore.applyCascade(plan)`

New action on `useReflowStore`:

```ts
applyCascade(plan): void {
  // 1. Begin a single history group via beginSilent/endSilent.
  // 2. For each rowUpdate: patchLocal(layerKey(...), { text }).
  // 3. If plan.newPagesNeeded > 0 → trigger rebuild() to materialise extra pages.
  //    (The existing pages array is regenerated from verses + overrides on rebuild.)
  // 4. Capture ONE history entry labelled "টেক্সট রিফ্লো" with scope tag.
}
```

Note on "new pages": because pages are rebuilt from `verses.json` + per-row font overrides, today the page count is derived. For text overflow that cannot fit existing rows of the surah, we fall back to triggering a `rebuild()` — the packer will create additional `vpage-N` pages naturally. This keeps the architecture invariant intact.

---

### Part C — Confirmation dialog (`CrossPageReflowDialog.tsx`)

```tsx
<AlertDialog open={!!pending} onOpenChange={...}>
  <AlertDialogContent>
    <AlertDialogTitle>লেআউট পরিবর্তন নিশ্চিত করুন?</AlertDialogTitle>
    <AlertDialogDescription>
      এই পরিবর্তনটির ফলে কিছু টেক্সট পরবর্তী পেজ {pending.crossesSurah && "ও সূরায়"} চলে যাচ্ছে।
      মোট {pending.affectedPages} টি পেজ প্রভাবিত হবে।
      আপনি কি নিশ্চিত যে আপনি লেআউট পরিবর্তন করতে চান?
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={cancel}>বাতিল</AlertDialogCancel>
      <AlertDialogAction onClick={confirm} className="bg-red-600">হ্যাঁ, পরিবর্তন করুন</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Triggering rules:
- `crossesPage === false && crossesSurah === false` → apply immediately, no dialog.
- Otherwise → store the plan in `editorStore.pendingReflow` and render the dialog. On confirm → `reflowStore.applyCascade(plan)`. On cancel → discard plan, restore editor text to pre-edit value.

The dialog is mounted once at the `Workspace` level (so it survives row unmounts during reflow), listening to `useEditorStore((s) => s.pendingReflow)`.

---

### editorStore additions

```ts
pendingReflow: CascadePlan | null;
setPendingReflow: (p: CascadePlan | null) => void;
```

---

### Acceptance criteria

- Pressing **Enter** mid-line in any Arabic/Bangla row pushes trailing text into the next row.
- Pressing **Enter** on an empty cursor creates an empty visual row and cascades following rows down.
- When cascade stays inside the current page → no dialog.
- When cascade pushes any text to **next page** or **next surah** → AlertDialog appears in Bengali with the required message; "বাতিল" reverts the edit, "হ্যাঁ" applies it.
- Linking switch ON for a layer + scope=page/surah/global → Move/Type-tool typography edits propagate as today.
- Linking switch OFF for a layer → edits stay local regardless of the scope picker.
- Symbol/Arabic/Bangla vertical alignment of reflowed rows is preserved (no extra dy/dx writes during cascade — text-only updates).
- `npx tsc --noEmit` exits 0 and `npm run build` exits 0.

Commit: `feat(Plan12): cross-page reflow cascade, linking-aware scope gating, confirmation dialog`
