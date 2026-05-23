## Plan 10 — Per-Word Typography Overrides

Goal: select an individual Arabic word inside a row and override `fontSize`, `color`, `letterSpacing` (extensible to others later), with the active Scope (general/page/surah/global) deciding fan-out. Triggers the existing `ScopeImpactWarningDialog` for surah/global via the existing `useLargeChangeGuard` hook.

### Architectural note (important)

Today `FabricLines.tsx` renders each row's Arabic as a single `<span>{aText}</span>`. There are no per-word DOM nodes and no `wordIndex` tracking at render time. To support per-word selection and styling, we must split the Arabic layer into per-word spans. We do this only inside the Arabic band (not Bangla) and only when the layer is not in inline-edit mode (the contenteditable editor must keep a single text node, otherwise caret behavior breaks).

We key word overrides by `(pageId, rowIndex, wordIndex)` rather than `(surah, ayah, wordIndex)`. The reflow store does not expose verse boundaries per displayed word, so logical keying would be lossy/brittle. Page+row+wordIndex is stable across the existing reflow lifecycle and matches how row/layer overrides are already keyed.

### 1. State (`src/state/overridesStore.ts`)

- Extend `LocalOverride` with optional `color?: string`. `fontPx` and `tracking` already exist and we reuse them (mapping to "fontSize" and "letterSpacing").
- Add a new key builder:
  ```ts
  export const wordLayerKey = (pageId: string, rowIndex: number, wordIndex: number): LocalKey =>
    `word:${pageId}:${rowIndex}:${wordIndex}`;
  ```
- Update `parseLayerKey` in the same file so the new `word:` keys are recognized; `getScopedLayerKeys` gains a `word` branch:
  - `general` → single key
  - `page` → all `word:<pid>:r:w` for every row in this page, same `w`? No — for word-scope the natural semantic is "every word in the page with the same surface text". Implementation: collect target pages by the existing logic, then for each target page iterate every row and every word index, and emit a `word:` key only when the rendered word text equals the source word's text. This requires reading the row text from `useReflowStore` (already done) and splitting it the same way the renderer does (single helper `splitArabicWords(text)` in a new `src/lib/wordSplit.ts` — whitespace split, preserving order, ignoring empty tokens).
  - `surah` and `global` apply the same text-match filter across their respective page sets.
- `patchScoped` keeps its current shape; the new word branch is handled inside `getScopedLayerKeys`. Text patches are already excluded from fan-out — that rule still holds (we never fan out word `text`).

### 2. Renderer (`src/components/studio/FabricLines.tsx`)

- When not in inline-editing mode, replace `<span>{aText}</span>` with a `WordSpans` component that:
  - splits `aText` via `splitArabicWords`
  - renders each word as a `<span data-sel-kind="word" data-sel-key="word:<pid>:r:w" data-word-index={w}>` separated by a single space text node (preserves justify behavior)
  - subscribes per-word with `useShallow` to `s.local[wordKey]` and applies `fontSize`, `color`, `letterSpacing` from that override (falling back to the row/layer values already computed above)
  - on click (when `isTypeTool`) stops propagation and calls `setSelection({ kind: "word", key, pageId, rowIndex: i, wordIndex: w })`. This already matches the `SelectionKind = "word"` already declared in `editorStore.ts`.
- Inline editing path is untouched (still a single contenteditable text node) so caret/reflow logic keeps working.
- Bangla band stays unchanged for this plan.

### 3. Inspector — Word controls (`src/components/studio/PropertiesPanel.tsx`)

- Add a new `WordPanel` block, rendered above the Scope selector when `selection?.kind === "word"`.
- Three controls, all wired through `patchScoped(selection.key, patch, scope)` so scope-fan-out and history capture come for free:
  - Font size (number + slider, 12–96, maps to `fontPx`)
  - Letter spacing (number + slider, -2 to 8, maps to `tracking`)
  - Color (native `<input type="color">` + hex text input + reset button, maps to new `color` field)
- Each control has a reset button that calls `patchScoped(key, { field: undefined }, scope)`.
- Show a small "নির্বাচিত শব্দ" header with the word's surface text (read from `useReflowStore` via pageId+rowIndex+wordIndex).

### 4. Large-change guard

- `useLargeChangeGuard` already triggers the Bengali dialog automatically when `scope === "surah" || scope === "global"`. The Word panel wraps each apply through it:
  ```ts
  request({
    scope,
    estimatedRows: estimatedAffectedWordCount,
    label: "শব্দ স্টাইল প্রয়োগ হচ্ছে…",
    action: () => patchScoped(selection.key, patch, scope),
  });
  ```
- `estimatedAffectedWordCount` is computed by counting how many target keys `getScopedLayerKeys` would emit (cheap reuse — or a small `countScopedWordMatches` helper).

### 5. Files touched

```text
src/lib/wordSplit.ts                              NEW   (splitArabicWords helper)
src/state/overridesStore.ts                       EDIT  (+color, +wordLayerKey, +word branch in scope fan-out)
src/components/studio/FabricLines.tsx             EDIT  (WordSpans renderer, word-click selection)
src/components/studio/PropertiesPanel.tsx         EDIT  (+WordPanel above scope selector)
.lovable/plan.md                                  EDIT  (mark Plan 10 done)
```

No changes to `editorStore.ts` (the `word` selection kind and fields are already there). No changes to `WordBlock.tsx` (used only by the verify route).

### 6. Acceptance criteria

- Click a word in Type Tool → `selection.kind === "word"` and the Word panel appears.
- Change color with `scope = general` → only that one word recolors.
- Change color with `scope = page` → every word on the page whose surface text matches the selected word recolors.
- Change color with `scope = surah` → matching words in that surah recolor; the warning dialog appears first.
- Change color with `scope = global` → matching words across all pages recolor; the warning dialog appears first.
- Reset buttons clear each field individually; full Reset / Undo / Redo continue to work via existing infra.
- `npx tsc --noEmit` exits 0; `npm run build` exits 0.

Commit: `feat(Plan10): per-word typography overrides with scope awareness`

### 7. Checker/fixer agent prompt for next loop (Bengali, ready to copy)

```
╔══════════════════════════════════════════════════════════════════════╗
║  Studio Al-Qalam — Checker Agent (Verify Plan 10)                  ║
║  Repo: https://github.com/ohidgazi00003-gif/quran-studio-pro        ║
║  Branch: main                                                       ║
╚══════════════════════════════════════════════════════════════════════╝

git pull origin main && npm install
npx tsc --noEmit        # must exit 0
npm run build           # must exit 0

Browser verify (Edit mode → Type tool):
  ✓ একটি আরবি শব্দে ক্লিক করলে Properties প্যানেলে "শব্দ" সেকশন আসে
  ✓ scope=general: শুধু সেই শব্দটির রং/সাইজ/Letter-spacing বদলায়
  ✓ scope=page:   একই পেজের একই শব্দ-পাঠ্য সবগুলো একসাথে বদলায়
  ✓ scope=surah:  Warning dialog আসে → "হ্যাঁ" দিলে পুরো সূরায় ম্যাচিং শব্দ বদলায়
  ✓ scope=global: Warning dialog আসে → পুরো মুসহাফে ম্যাচিং শব্দ বদলায়
  ✓ প্রতিটি কন্ট্রোলের পাশে Reset কাজ করে; Undo/Redo কাজ করে
  ✓ Inline text edit (contenteditable) আগের মতই কাজ করে — শব্দ-স্প্যান ভেঙে edit ব্রেক হয় না

কোনো ব্যর্থতা পেলে fixer mode-এ যাও, একটাই commit per loop, force push নিষেধ।
পরবর্তী টাস্ক: Plan 11 — Mobile Edit Mode & Responsiveness।
```
