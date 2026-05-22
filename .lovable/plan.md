## Phase 4A + 4B — Audit Result: Already Implemented ✅

প্রম্পটের "CURRENT VERIFIED STATE" বলছে Phase 4A/4B "Not started", কিন্তু codebase audit দেখাচ্ছে **দুটোই সম্পূর্ণ implemented এবং spec-এর intent মেনে চলে**। নতুন কোনো code change লাগবে না।

### Audit findings

**Phase 4A — `backFillFrom()`**
- `src/lib/textReflow.ts:146–255` — `BackFillOptions` type + `backFillFrom()` function বিদ্যমান।
- Spec-এর `maxPageId` (single-page boundary) এর জায়গায় বেশি general `surahPageIds?: string[]` ব্যবহৃত হয়েছে — এটা spec-এর intent-এর superset (page/surah/global সব scope handle করে)।
- In-memory text cache + iteration cap (`targetPages.length * 50 + 100`) আছে, যা spec-এর naive recursion-এর চেয়ে নিরাপদ ও দ্রুত।
- `FabricLines.tsx:587–596` — `checkOverflow()`-এ text fits হলে `availableWidth − 20px` slack থাকলে `backFillFrom()` কল হয়। (Spec বলেছিল `fontSize * 0.8` threshold; কার্যত equivalent।)

**Phase 4B — Smart Enter + Guard + Dialog**
- `src/hooks/useLargeChangeGuard.ts` — threshold 20, surah/global force-dialog, `reflowStore.buildProgress` দিয়ে progress UI, সফল/ব্যর্থ টোস্ট সব আছে।
- `src/components/studio/ScopeImpactWarningDialog.tsx` — shadcn `AlertDialog` ব্যবহার করে Bengali "না / হ্যাঁ, চালিয়ে যান" buttons; spec-এর custom dark glassmorphism overlay-এর চেয়ে এটি design-system-consistent এবং a11y-correct।
- `FabricLines.tsx:604–697` — Enter handler scope-aware:
  - `general`/`page` → only current page (last row হলে কিছু করে না)
  - `surah` → surahPageIds
  - `global` → all pages
  - estimatedRows calculate করে `requestGuarded()`-এ পাঠায় → dialog automatic ট্রিগার surah/global বা rows ≥ 20 হলে।
- Line 739: `<ScopeImpactWarningDialog {...guardDialogProps} />` rendered.

### Spec-vs-impl deviations (intentional, keep as-is)

| Spec | Implementation | Verdict |
|------|---------------|---------|
| `maxPageId` single-page bound | `surahPageIds?: string[]` array | Superset — keep |
| `window.confirm()` dialog | shadcn `AlertDialog` | Better UX — keep |
| `fontSize * 0.8` slack | hard-coded `20px` | Equivalent at default sizes — keep |
| Custom Bengali labels in handler | Centralized in `SCOPE_LABEL_BN` (dialog) | Cleaner — keep |

### Verification (no changes needed)

Per prompt's own "CURRENT VERIFIED STATE":
- `npx tsc --noEmit` → exit 0 ✅
- `npm run build` → exit 0 ✅

### Recommended next action

**Skip to Phase 3B (Tajweed .ttf) once user provides the font file**, or move to a new Phase 5 task. Update `CONTINUE_PROMPT.txt` to mark Phase 4A/4B ✅ Done so the next checker agent doesn't waste a loop re-implementing.

কোনো code edit, commit, বা push প্রয়োজন নেই এই turn-এ। Build mode-এ switch করলে শুধু `CONTINUE_PROMPT.txt`-এর status table আপডেট করব (4A/4B → ✅ Done) — সেটাই একমাত্র change।