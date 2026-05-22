## Phase 3B — Custom Tajweed Icon Font (.woff2)

Replace the 12 inline `<img src={TAJWEED_SVG[id]} />` references with a single custom icon font, so symbols are text glyphs (cacheable, GPU-rasterized, no per-symbol HTTP/DOM overhead, scales perfectly with `font-size`).

### Scope

Affects: `src/tajweed/svgMap.ts`, `src/lib/tajweed/svgMap.ts` (duplicate), `src/components/studio/TopSymbolLayer.tsx`, `src/components/studio/RulesPanel.tsx`, `src/components/verify/VerseRow.tsx`, `src/verify/VerseRow.tsx`. Adds font asset + new `fontCharMap.ts`. CSS additions in `src/styles.css`.

Out of scope: any tajweed rule logic, measurement, or Arabic text rendering.

### Step 1 — Generate `tajweed-symbols.woff2`

Add `scripts/build-tajweed-font.mjs` that reads the 12 SVGs in `src/assets/tajweed/`, normalizes each to a 1000×1000 glyph viewBox, and emits an OpenType-SVG font compiled to `.woff2`. Uses `svg2ttf` + `wawoff2` from npm (pure JS, runs in Node, no native binaries).

```text
scripts/build-tajweed-font.mjs
  ├─ Reads src/assets/tajweed/{1..12}.svg
  ├─ Flattens transforms, normalizes viewBox → 1000×1000
  ├─ Assigns each to PUA codepoint U+E001..U+E00C
  ├─ Outputs public/fonts/tajweed-symbols.woff2
  └─ Outputs src/tajweed/fontCharMap.generated.ts
```

Run once via `node scripts/build-tajweed-font.mjs`; the resulting `.woff2` (~2–4 KB) is committed to `public/fonts/`. The script is re-runnable if SVGs change later.

Dev dependencies to install: `svgo`, `svg2ttf`, `wawoff2`.

### Step 2 — Add `src/tajweed/fontCharMap.ts`

Stable hand-maintained map (the `.generated.ts` is the source of truth but we export through a clean module that also keeps the Bengali rule names):

```ts
export type TopSymbolId = 1|2|3|4|5|6|7|8|9|10|11|12;

export const TAJWEED_CHAR: Record<TopSymbolId, string> = {
  1: "\uE001", 2: "\uE002", 3: "\uE003", 4: "\uE004",
  5: "\uE005", 6: "\uE006", 7: "\uE007", 8: "\uE008",
  9: "\uE009", 10: "\uE00A", 11: "\uE00B", 12: "\uE00C",
};

export const TAJWEED_RULE_NAMES: Record<TopSymbolId, string> = { /* moved from svgMap */ };
export const ALL_RULE_IDS: TopSymbolId[] = [1,2,3,4,5,6,7,8,9,10,11,12];
```

### Step 3 — Add `@font-face` + helper class in `src/styles.css`

```css
@font-face {
  font-family: "TajweedSymbols";
  src: url("/fonts/tajweed-symbols.woff2") format("woff2");
  font-display: block;
  font-weight: normal;
  font