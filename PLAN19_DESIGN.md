# Plan 19 — Surah Navigation Sidebar Improvement & Search

## Goal

Improve page navigation for large मुসহাফ projects by replacing the flat 600+ page list with a beautiful, grouped Surah Navigation Sidebar featuring collapsible sections and Bengali/English Surah search.

## Proposed Scope

### 1. Surah Grouping in PageList
- Map pages to Surahs using `useReflowStore((s) => s.distribution)` or `surahDistribution` mapping.
- Render collapsible headers for each Surah (e.g., `সূরা ১: আল-ফাতীহা (১টি পেজ)`, `সূরা ২: আল-বাকারাহ (৪০টি পেজ)`).
- Toggling a Surah header expands/collapses the page thumbnails inside it.
- Keep the current virtualized `react-window` layout or optimize it so expanding/collapsing doesn't break virtualization performance.

### 2. Search Integration
- Add a modern, curated dark Search Input at the top of `PageList.tsx` with a search icon (e.g., from `lucide-react`).
- Search matches:
  - Surah numbers (e.g., "1", "2")
  - Surah Bengali names (e.g., "আল-ফাতীহা", "বাকারাহ")
  - Surah Arabic/English transliterated names (if available in database mapping).
- Search dynamically filters the list of displayed Surahs and active page thumbnails.

### 3. Click and Selection sync
- Clicking a Surah header expands it and scrolls the canvas directly to the *first page* of that Surah.
- Selecting a page thumbnail navigates to that page as usual.
- The sidebar dynamically highlights the Surah matching the currently active page.

## Proposed Files to Modify

#### [MODIFY] [PageList.tsx](file:///c:/xampp/htdocs/q01/quran-studio-pro/src/components/studio/PageList.tsx)
- Re-architect the list rendering to group pages by Surah.
- Add search state and search text box.
- Implement collapse/expand states.

## Verification Plan

### Automated Verification
- Create a Playwright verification script `scripts/verify-sidebar.mjs` that:
  - Opens the page.
  - Types "আল-বাকারাহ" in the search box.
  - Verifies that only Al-Baqarah shows up and clicking it navigates to its first page.

### Manual Verification
- Verify that expanding and collapsing is smooth with zero latency or performance drops on large counts.
- Verify that the layout conforms to the rich dark aesthetics.
