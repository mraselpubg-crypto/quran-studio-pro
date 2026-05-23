# Plan 19 — Complete Surah Sidebar (All 114 Names + UX Polish)

## Background (Checking Agent Audit — 2026-05-23)

`PageList.tsx` already has a Surah-grouped, collapsible sidebar with search.
However the audit found the following **critical gaps**:

| Issue | Severity |
|-------|----------|
| `SURAH_NAMES` map has only 9 of 114 Surahs → remaining 105 show generic `"সূরা N"` label | 🔴 HIGH |
| `SURAH_NAMES_AR` map has only 9 of 114 Arabic names → same fallback issue | 🔴 HIGH |
| Search matches Arabic name as raw string — not Unicode-normalized, breaks partial Bengali search | 🟡 MED |
| Surah header click only toggles expand/collapse — does NOT navigate canvas to that Surah's first page | 🟡 MED |
| No Surah total ayah count shown in header (e.g. "٧ آيات") | 🟢 LOW |
| Only 9 Surahs have real names — sidebar looks incomplete for any page > Surah 9 | 🔴 HIGH |

---

## Goal

Complete the Surah Sidebar so it is **fully functional for all 114 Surahs** of the Quran with correct Bengali and Arabic names, smart search, and direct Surah-level navigation.

---

## Tasks

### Task 1 — Complete `SURAH_NAMES` (Bengali) — All 114 entries
**File:** [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx)

Fill in the full `SURAH_NAMES` Record with all 114 Bengali/transliterated Surah names.

### Task 2 — Complete `SURAH_NAMES_AR` (Arabic) — All 114 entries
**File:** [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx)

Fill in the full `SURAH_NAMES_AR` Record with all 114 Arabic Surah names.

### Task 3 — Add English transliteration map (`SURAH_NAMES_EN`) — All 114 entries
**File:** [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx)

Add a new `SURAH_NAMES_EN` Record for English transliterations (e.g. "Al-Baqarah", "Al-Imran") to allow English-language search in the search box.

Update search filter to also match `SURAH_NAMES_EN`.

### Task 4 — Surah header click → navigate to first page
**File:** [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx)

When a user clicks the Surah header button, in addition to toggling expand/collapse, call `onSelect(pages[0].pageId)` to navigate the canvas to the first page of that Surah.

### Task 5 — Add Surah ayah count to header display
**File:** [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx)

Add a small `SURAH_AYAH_COUNT` record (114 entries) and display the verse count in the Surah header (e.g. `(٧ آيات)`).

### Task 6 — New Playwright verification script
**File:** [scripts/verify-sidebar.mjs](file:///c:/xampp/htdocs/q01/quran-studio-pro/scripts/verify-sidebar.mjs) **[NEW]**

Create a Playwright smoke test that:
1. Opens `http://localhost:8080`
2. Navigates to Editor mode
3. Types "Al-Baqarah" or "আল-বাকারা" in the sidebar search box
4. Verifies the list filters to only show Surah 2
5. Clicks the Surah 2 header → verifies canvas navigates to page 2
6. Takes screenshots + writes `scripts/playwright-artifacts/sidebar-report.json`

---

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx) | Add all 114 Bengali, Arabic, English Surah name maps; add navigation on header click; add ayah count |
| 2 | [scripts/verify-sidebar.mjs](file:///c:/xampp/htdocs/q01/quran-studio-pro/scripts/verify-sidebar.mjs) | **NEW** — Playwright smoke for sidebar search + navigation |

**No other files need modification.** `editorStore` already has `expandedSurahs`, `toggleSurah`, `expandSurah`. `reflowStore` already has `PageDistribution` with `surah` field.

---

## Verification Steps

```powershell
# 1. TypeScript check
npx tsc --noEmit

# 2. Build check
npm run build

# 3. Start dev server (if not running)
npm run dev

# 4. Existing smoke tests (must still pass)
node scripts/verify-editor.mjs
node scripts/verify-reflow.mjs
node scripts/verify-active-page.mjs

# 5. New sidebar smoke test
node scripts/verify-sidebar.mjs
```

---

## Commit Message

```
feat(Plan19): complete all-114-Surah sidebar with Bengali/Arabic/English names, search, and navigation
```

---

## Handoff Files to Update After Completion

| File | What to change |
|------|---------------|
| [CONTINUE_PROMPT.txt](file:///c:/xampp/htdocs/q01/quran-studio-pro/CONTINUE_PROMPT.txt) | Mark Plan 19 ✅; add Plan 20 stub |
| [AGENT_README.md](file:///c:/xampp/htdocs/q01/quran-studio-pro/AGENT_README.md) | Update status table: Plan 19 ✅, Plan 20 ⬜ |
| [WORKING_AGENT_PROMPT.txt](file:///c:/xampp/htdocs/q01/quran-studio-pro/WORKING_AGENT_PROMPT.txt) | Update "CURRENT JOB" to Plan 20 |
| PLAN20_DESIGN.md | Create stub for Plan 20 |
| PLAN20_AGENT_PROMPT.txt | Create copy-paste prompt for next agent |
