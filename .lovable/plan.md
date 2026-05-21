# Studio Al-Qalam — Import + প্রয়োগ Refactor Plan

The repo `ohidgazi00003-gif/QuranMakerV3` is now public and cloned to `/tmp/qm`. The current sandbox is an empty TanStack Start template, so first I'll import the full codebase, then apply your "প্রয়োগ সিস্টেম পুনর্গঠন" plan exactly as specified.

## Step 0 — Import the codebase into this Lovable project

Copy from `/tmp/qm` → project root:
- `src/` (full), `tests/`, `public/`
- `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`, `components.json`, `eslint.config.js`, `bunfig.toml`
- `CODEBASE_OVERVIEW.md`, `AGENT_PROMPT.md` (reference)

Skip: `.git`, `node_modules`, `playwright-report`, `test-results`, screenshots, `.bat` scripts.

Then `bun install` so `react-window`, `zustand`, etc. resolve. Live preview will run automatically (Lovable manages the dev server — no `npm run dev` / port 8080 needed).

Sanity gate: `npx tsc --noEmit` → fix any blocking errors (incl. the known `PageList.tsx` react-window v2 import + add `"skipLibCheck": true` to `tsconfig.json`) so the preview boots.

## Step 1 — `src/lib/textReflow.ts` (Critical)
- Extend `ReflowOptions` with optional `surahPageIds?: string[]`.
- In `reflowFrom()`, derive `targetPages = surahPageIds ? allPages.filter(p => surahPageIds.includes(p.id)) : allPages` and iterate `targetPages` instead of `allPages`. Everything else unchanged.

## Step 2 — `src/components/studio/FabricLines.tsx` (Critical)

2ক — Type Tool click → setSelection
- On the Arabic band `<div>` add `onClick={isTypeTool ? (e)=>{ e.stopPropagation(); useEditorStore.getState().setSelection({kind:"layer", key:aLk, pageId, rowIndex:i, layerKind:"arabic"}); } : undefined}`.
- Same for Bangla band with `bLk` / `"bangla"`.

2খ + 2গ — Surah-bounded reflow
- In `InlineTextEditor` (and in `checkOverflow()` call path), compute:
  ```
  const dist = useReflowStore.getState().distribution;
  const srcSurah = dist.find(d => d.pageId === pageId)?.surah ?? 0;
  const surahPageIds = srcSurah > 0
    ? dist.filter(d => d.surah === srcSurah).map(d => d.pageId)
    : undefined;
  ```
- Pass `surahPageIds` into every `reflowFrom({...})` call (Enter handler + overflow check). Encapsulate inside `getReflowBase()` as you specified in Note 3 so all call sites pick it up.

## Step 3 — `src/components/studio/PropertiesPanel.tsx` (Critical)

3ক/3খ — Scope-aware `DSlider`
- New signature: `DSlider({ k, localField?, label, min, max, fallback, color })`.
- Inside:
  - Read `scope` + `selection` from `useEditorStore`, and `localOverride = s.local[selection.key]` from `useOverridesStore`.
  - `localValue = localField ? localOverride?.[localField] : undefined`.
  - `effectiveStored = (scope !== "global" && selection && localField) ? (localValue ?? stored ?? fallback) : (stored ?? fallback)`.
  - `applyValue(v)`: if `scope === "global" || !selection || !localField` → `setGlobal(k, v)`; else `void patchScoped(selection.key, { [localField]: v }, scope)`.
  - `resetValue()`: same branching with `undefined`.
  - `isOverridden`: based on `localValue` when scope-local, else on `stored`.

3গ — Pass `localField` only on size sliders
- Arabic/Bangla/Symbol font-size sliders: `localField="fontPx"`.
- Y-offset sliders: omit `localField` (stay global-only, per Note 2).

3ঘ — Remove `RowDetailSection`
- Delete the `{selection && (scope === "page" || scope === "general") && (…RowDetailSection…)}` block and the function itself.

3 (label) — `"প্রভাব স্তর (Scope)"` → `"প্রয়োগ স্তর"`.

## Step 4 — `src/components/studio/CanvasToolbar.tsx`
- Line ~205: `প্রভাব` → `প্রয়োগ`.

## Step 5 — `src/components/studio/Artboard.tsx` (Crash fix)
- Move `useFont()` to top-level (never conditional).
- Replace `useFont()` indirection where needed with `const fontCtx = useContext(FontContext); const arabicFamily = fontCtx?.activeFamily ?? "'Excellent Arabic', serif";` so pages rendered outside the provider don't crash.

## Step 6 — `src/state/overridesStore.ts`
- No code change. Verified `getScopedLayerKeys` already returns `[representativeKey]` for `"general"`. Note in PR description only.

## Verification
After each step: `npx tsc --noEmit` clean. Then in the live preview:
- Type Tool → click Arabic/Bangla band → text becomes editable (Step 2ক).
- Edit causing overflow → words shift only within the same surah's pages (Steps 1 + 2খ/গ).
- Scope = "সাধারণ"/"পেজ"/"সূরা" + Arabic font-size slider → only that scope's layers change, global stays untouched; scope = "global" still updates everywhere (Step 3).
- Toolbar reads "প্রয়োগ"; Properties panel reads "প্রয়োগ স্তর" (Step 4 + 3 label).
- Navigate through pages — no FontContext crash (Step 5).

## Technical notes
- `react-window` v2 renamed exports; PageList fix uses whatever the installed `.d.ts` actually exports and inlines `RowComponentProps<T>` if missing.
- `html2canvas` / `bun add` work fine for later PNG-export work; out of scope for this plan.
- `patchScoped` runs through the existing `getScopedLayerKeys` fan-out — no store changes needed for "general"/"page"/"surah" to map to the right layer set when the slider passes `localField:"fontPx"`.
