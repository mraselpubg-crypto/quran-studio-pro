# Plan #9 — Smart Enter Key: Scope-Aware Cascade + Warning Dialog + Large-Change Guard

Enter key currently pushes after-cursor text into only the next row, ignoring the active scope (general/page/surah/global). This plan makes Enter respect scope bounds, warn the user when many rows will be affected, and surface a progress bar during big cascades.

## Files

1. **NEW** `src/components/studio/ScopeImpactWarningDialog.tsx` — Bengali warning modal.
2. **NEW** `src/hooks/useLargeChangeGuard.ts` — Hook that gates an action behind the dialog + progress.
3. **EDIT** `src/components/studio/FabricLines.tsx` — Replace Enter handler with scope-aware logic using the guard.

No store schema changes. `useReflowStore.buildProgress` already exists and is set/cleared from other places.

---

## 1. `ScopeImpactWarningDialog.tsx`

A controlled modal built on the existing shadcn `AlertDialog` (already in `src/components/ui/alert-dialog.tsx` per file list). Props:

```ts
type Props = {
  open: boolean;
  scope: "general" | "page" | "surah" | "global";
  affectedRows: number;
  onConfirm: () => void;
  onCancel: () => void;
};
```

Scope-label map (Bengali): `general → "সাধারণ"`, `page → "পেজ"`, `surah → "সূরা"`, `global → "সকল"`.

Body text: `"আপনি ${label} মোডে এডিট করছেন। এই পরিবর্তনের ফলে আনুমানিক ${affectedRows} টি লাইনে প্রভাব পড়বে। আপনি কি চালিয়ে যেতে চান?"`

Buttons: `"না"` (cancel) and `"হ্যাঁ, চালিয়ে যান"` (action). Uses semantic tokens from `styles.css` — no hard-coded colors.

---

## 2. `useLargeChangeGuard.ts`

```ts
export type GuardOptions = {
  scope: SelectionScope;
  estimatedRows: number;
  /** Threshold above which the dialog is shown. Default 20. */
  threshold?: number;
  /** Run the actual work. May be async. */
  action: () => void | Promise<void>;
  /** Optional progress label (Bengali). */
  label?: string;
};

export function useLargeChangeGuard(): {
  request: (opts: GuardOptions) => void;
  dialogProps: Props; // wire into <ScopeImpactWarningDialog {...dialogProps} />
};
```

Behavior:
- If `estimatedRows < threshold` AND `scope === "general"` → run `action()` immediately.
- If `scope` is `surah`/`global`, OR `estimatedRows >= threshold` → open dialog. On confirm:
  1. `useReflowStore.setState({ buildProgress: { label: label ?? "পরিবর্তন প্রয়োগ হচ্ছে…", pct: 10 } })`
  2. `await new Promise(r => requestAnimationFrame(r))` — yield once so the progress bar paints before the heavy sync work.
  3. Update progress to `{ pct: 60 }`, run `action()`.
  4. Set `{ pct: 100 }`, then `setTimeout(() => set({ buildProgress: null }), 400)`.
  5. `toast.success("পরিবর্তন সম্পন্ন হয়েছে")` via `sonner`.
- On cancel: close dialog, no-op.

The hook holds the pending action + scope/rows in local state; `dialogProps.open` derives from that state.

---

## 3. `FabricLines.tsx` — scope-aware Enter

Imports to add: `useLargeChangeGuard`, `ScopeImpactWarningDialog`, `useEditorStore` (already imported).

Render the dialog once at the bottom of `InlineTextEditor`'s return so it sits within the editor's lifecycle.

Replace the Enter branch (lines ~608–652):

```ts
if (e.key === "Enter" && !e.shiftKey) {
  e.preventDefault();
  const el = ref.current; if (!el) return;

  const { before, after } = getTextAroundCursor(el);
  const beforeText = before.trim();
  const afterText = after.trim();

  commit(beforeText);
  el.textContent = beforeText;

  if (!afterText) return; // nothing to cascade

  const scope = useEditorStore.getState().scope;
  const base = getReflowBase();
  const allPages = base.allPages;

  // 1. Determine target page IDs from scope
  let scopePageIds: string[] | undefined;
  if (scope === "general" || scope === "page") {
    scopePageIds = [pageId];
  } else if (scope === "surah") {
    scopePageIds = base.surahPageIds ?? [pageId];
  } else {
    scopePageIds = undefined; // global → all pages
  }

  // 2. Resolve insertion point (next row, possibly next page)
  const nextRowIdx = rowIndex + 1;
  const nextOnPage = nextRowIdx < lines.length;
  let targetPageId = pageId;
  let targetRowIdx = nextRowIdx;
  if (!nextOnPage) {
    if (scope === "general") return; // general never crosses row boundary
    const pi = allPages.findIndex(p => p.id === pageId);
    const next = pi >= 0 ? allPages[pi + 1] : undefined;
    if (!next) return;
    if (scope === "page") return; // page-scope won't spill to next page
    targetPageId = next.id;
    targetRowIdx = 0;
  }

  // 3. Build combined overflow text (afterText + existing text at target row)
  const tPage = allPages.find(p => p.id === targetPageId)!;
  const tLk = layerKey(targetPageId, targetRowIdx, layer);
  const existing = base.localMap[tLk]?.text
    ?? (layer === "arabic" ? tPage.lines[targetRowIdx]?.arabic : tPage.lines[targetRowIdx]?.bangla)
    ?? "";
  const combined = existing ? afterText + " " + existing : afterText;

  // 4. Estimate affected rows = sum of rows in scoped pages from insertion point onward
  const estimatedRows = estimateAffected(allPages, scopePageIds, targetPageId, targetRowIdx);

  // 5. Wrap in guard
  guard.request({
    scope,
    estimatedRows,
    label: "এন্টার কী প্রয়োগ হচ্ছে…",
    action: () => reflowFrom({
      ...base,
      surahPageIds: scopePageIds, // existing reflowFrom already filters by this
      startPageId: targetPageId,
      startRowIndex: targetRowIdx,
      startOverflow: combined,
    }),
  });
  return;
}
```

Helper `estimateAffected()` (local function in the file): iterates `scopePageIds` from `targetPageId` forward, summing `lines.length` per page. Cheap, no canvas measurement.

### Scope rules summary

| Scope    | Cascade range                         | Dialog?                                         |
|----------|---------------------------------------|-------------------------------------------------|
| general  | Same row only — Enter no-ops if row is the last of the page | Never |
| page     | Only within current page              | If overflow reaches last row of page (estimatedRows ≥ remaining rows of page) → dialog |
| surah    | All pages of current surah            | Always (or threshold) |
| global   | All pages of all surahs               | Always |

The `useLargeChangeGuard` dialog-trigger logic above already encodes this: surah/global always open dialog; page only when `estimatedRows ≥ threshold` (which naturally triggers at/near end of page).

---

## Verification

- `npx tsc --noEmit` clean.
- Manual: 
  - General + middle row → splits silently.
  - Page + last row → dialog appears; confirm cascades within page only.
  - Surah/global → dialog appears with row count; progress bar visible briefly.
  - Cancel → no change.

## Out of scope
- Undo/redo behavior beyond what `patchLocal`/`reflowFrom` already capture.
- Back-fill on Backspace (covered by Plan #8).
- Persisting threshold preference.
