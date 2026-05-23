# Plan 17 — Active Page Context (Design Doc)

**Repo:** https://github.com/mraselpubg-crypto/quran-studio-pro.git  
**Status:** Not implemented — see `CONTINUE_PROMPT.txt` for agent tasks

---

## Goal

Single source of truth for **which page the user is viewing** on the canvas, so scope operations work without a row selection.

---

## Current vs target

| Concern | Today | After Plan 17 |
|---------|--------|----------------|
| Visible page | `Workspace` local `useState(activeId)` | `editorStore.activePageId` |
| Reset page scope, no selection | `pages[0]` fallback | `activePageId` |
| History click navigate | Toolbar only; HistoryTab no navigate | HistoryTab → `navigateTo` |
| Row flash after navigate | Broken (Workspace clears `focusedRowKey`) | Flash preserved 1.2s |

---

## Store API (`editorStore.ts`)

```ts
activePageId: string | null;
setActivePageId: (id: string | null) => void;

navigateTo(pageId: string, rowKey?: string): void;
// → setActivePageId(pageId)
// → focusedRowKey = rowKey ?? null
// → setTimeout 1200ms → clearFocusedRow()
```

Keep `navigateToPageId` only if needed for async consumers; prefer direct `setActivePageId`.

---

## Data flow

```
PageList.onSelect ──┐
Prev/Next buttons ──┼──► setActivePageId ──► Workspace renders page
navigateTo() ───────┘         │
                              ├──► ResetGroup (page scope)
                              └──► reflowScope fallbacks (optional)
```

---

## File touch list

| File | Change |
|------|--------|
| `src/state/editorStore.ts` | Add fields + fix navigateTo |
| `src/components/studio/Workspace.tsx` | Store-driven active page; fix effect |
| `src/components/studio/PropertiesPanel.tsx` | ResetGroup + HistoryTab |
| `src/lib/editorContext.ts` | Optional helper |

---

## Edge cases

1. **Reflow rebuild** removes current page id → fallback to `pages[0]` or keep index
2. **Selection on page A, viewing page B** — page reset uses **activePageId** (canvas truth)
3. **Global history entry** without pageId → skip navigate, restore only
4. **Lovable sandbox** — same file paths under `src/`; sync to GitHub manually after edit

---

## Verification

- Manual: page 2 visible, no selection, page-scope reset → only page 2 cleared
- History row click → correct page + amber row flash
- `npx tsc --noEmit`, `npm run build`, `verify-editor.mjs`

---

## Commit

```
feat(Plan17): active page context for scoped reset and navigation
```
