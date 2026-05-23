# Plan 16 — Linked Area-Text Auto Reflow

InDesign-style Area Text: যখন একটি লেয়ারের টেক্সট টাইপিং বা টাইপোগ্রাফি পরিবর্তনের (fontPx / leading / tracking / hScale) কারণে ওভারফ্লো করে, তখন সেই লেয়ারের Linking switch + Editor scope অনুযায়ী পরবর্তী row/page-এ ক্যাসকেড হবে।

এক ইঞ্জিন, এক স্কোপ-হেল্পার, সব এন্ট্রি পয়েন্টে ব্যবহৃত:
- `InlineTextEditor` (টেক্সট এডিট, Enter, paste)
- `CharacterPanel` / `DSlider` (টাইপোগ্রাফি)

Linking **OFF** ⇒ অন্য সারিতে কখনো ছড়াবে না (overflow হলে clip + toast)।
Linking **ON** ⇒ editor scope (general/page/surah/global) মেনে চলবে।
Cross-page/surah ⇒ বিদ্যমান `CrossPageReflowDialog` + `useLargeChangeGuard` রিইউজ।

## Step 1 — `src/lib/reflowScope.ts` (নতুন)

```ts
type ReflowScopeResult = {
  cascade: boolean;
  pageIds: string[];
  layer: "arabic" | "bangla";
};
effectiveReflowScope(editorScope, layer, pageId): ReflowScopeResult
```

| Link (layer) | scope    | cascade | pageIds                  |
|--------------|----------|---------|--------------------------|
| OFF          | any      | false   | [pageId]                 |
| ON           | general  | true    | [pageId]                 |
| ON           | page     | true    | [pageId]                 |
| ON           | surah    | true    | distribution → surah ids |
| ON           | global   | true    | all page ids             |

`useLinkingStore` + `useReflowStore.distribution` থেকে পড়বে। `symbol` লেয়ারে টেক্সট reflow নেই — স্কিপ।

## Step 2 — `src/lib/textReflow.ts` এক্সটেন্ড

`reflowLayerText({ pageId, rowIndex, layer, reason, fontFamily, availableWidth })`:
1. `effectiveReflowScope` রিসলভ। `cascade=false` হলে শুধু বর্তমান row মাপ; overflow → `{ clipped: true }` রিটার্ন (caller toast দেখাবে); অন্য row-তে `patchLocal` নয়।
2. `getEffectiveText` দিয়ে টেক্সট আনো।
3. `splitToFitForLayer` (Step 5)। Overflow → `reflowFrom`, শুধু `result.pageIds`-এ সীমিত।
4. Underflow + room → `backFillFrom` (same pageIds)।
5. আগে `planCascade`; `crossesPage`/`crossesSurah` → `editorStore.setPendingReflow` (ডায়ালগ confirm/cancel handle করে)।

## Step 3 — Typography-triggered reflow

`src/state/overridesStore.ts` → নতুন `patchTypographyScoped(repKey, patch, scope)`:
- প্রথমে বিদ্যমান `patchScoped` কল করে।
- তারপর target layerKeys ইটারেট করে প্রতিটির জন্য `queueMicrotask(() => reflowLayerText(...))`।
- Whitelist: `fontPx`, `leading`, `tracking`, `hScale`।
- surah/global বা affected rows ≥ 20 → `useLargeChangeGuard.request` দিয়ে wrap।

`CharacterPanel` ও `DSlider`-এ শুধু এই চারটি ফিল্ডের পাথ `patchTypographyScoped`-এ রাউট করো; বাকি স্টাইল ফিল্ড আগের মতোই `patchScoped`।

## Step 4 — `FabricLines.tsx` unify

- `getReflowBase()` সরিয়ে `effectiveReflowScope(editorStore.scope, layer, pageId)` ব্যবহার।
- `checkOverflow`: `cascade=false` + overflow → টেক্সট বর্তমান row-তেই থাকুক, `toast.warning("লিংক বন্ধ — ওভারফ্লো অন্য সারিতে যাবে না")`, `reflowFrom` কল **নয়**।
- Enter handler একই হেল্পার ব্যবহার করবে (ডুপ্লিকেট surah-id construction সরাও)।

## Step 5 — Arabic-aware splitter

`src/lib/canvasMeasure.ts` → `splitToFitForLayer(text, maxWidth, font, size, layer)`:
- `layer === "arabic"` → `splitArabicWords` (`src/lib/wordSplit.ts`) + cumulative `measureTextWidthCanvas`। একক oversize শব্দ পুরো রাখা হবে (ডকুমেন্টেড)।
- অন্যথায় বিদ্যমান `splitToFitCanvas`।

`textReflow.ts`-এর `splitToFit`, `reflowFrom`, `backFillFrom`, `planCascade` — সব `layer` প্যারামিটার নেবে এবং `splitToFitForLayer`-এ রাউট করবে।

## Step 6 — `PropertiesPanel.tsx` LinkingPanel copy

- Title: **"এরিয়া টেক্সট লিংক"**
- ON badge সাবটাইটেল: *"ওভারফ্লো এই স্কোপে রিফ্লো হবে"*
- OFF সাবটাইটেল: *"শুধু এই সারি — ওভারফ্লো অন্য লাইনে যাবে না"*

## Step 7 — Verification

- নতুন `scripts/verify-reflow.mjs` (Playwright): editor → type tool → arabic row → linking ON + scope=page → fontPx বড় করো → পরের row-এ tail text এসেছে কিনা assert; তারপর linking OFF → কোনো cross-row পরিবর্তন নেই + toast assert।
- `npx tsc --noEmit`, `npm run build`, `node scripts/verify-editor.mjs`, `node scripts/verify-reflow.mjs`।

## Files touched

| File | Change |
|------|--------|
| `src/lib/reflowScope.ts` | NEW |
| `src/lib/textReflow.ts` | `reflowLayerText`, layer-aware split |
| `src/lib/canvasMeasure.ts` | `splitToFitForLayer` (arabic path) |
| `src/state/overridesStore.ts` | `patchTypographyScoped` + microtask reflow |
| `src/components/studio/FabricLines.tsx` | unify scope helper, link-OFF clip+toast |
| `src/components/studio/PropertiesPanel.tsx` | typo fields → `patchTypographyScoped`, copy |
| `src/hooks/useLargeChangeGuard.ts` | reuse for typography fan-out |
| `scripts/verify-reflow.mjs` | NEW E2E |
| `CONTINUE_PROMPT.txt` | Plan 16 ✅ + Plan 17 handoff |

## Invariants

- `text` ফিল্ড কখনো `patchScoped` fan-out নয়।
- `reflowLayerText` `rebuild()` কল করে না — শুধু local `text` overrides।
- সব Hooks early return এর আগে।
- `confirm()` নয় — AlertDialog।
- Symbol layer text reflow থেকে বাদ।
- GitHub token চ্যাটে নয়।

## Env note

আমার sandbox-এ `c:\xampp\...` লোকাল পাথ বা আপনার dev সার্ভার (`localhost:8080`) নেই — কাজটি Lovable repo-তেই হবে (একই কোডবেস)। `git pull/push` Lovable নিজেই হ্যান্ডেল করে; আমি ম্যানুয়াল git চালাবো না। Verification এই sandbox-এর build output + (যদি সম্ভব হয়) preview-তে হবে।

## Commit

`feat(Plan16): linked area-text auto reflow on typography and scope`
