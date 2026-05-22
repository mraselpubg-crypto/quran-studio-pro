# Phase 5 — Surah Grouping in PageList

**Repo:** github.com/ohidgazi00003-gif/quran-studio-pro (branch: main)
**Goal:** `PageList.tsx`-এর flat 600+ page list-কে surah-wise collapsible group-এ রূপান্তর + Arabic/Bengali search।

---

## Files to change (2)

### 1. `src/state/editorStore.ts`
Add to state:
```ts
expandedSurahs: Set<number>;
toggleSurah: (n: number) => void;
expandSurah: (n: number) => void;   // for auto-expand on activeId change
```
- Initial: `new Set<number>()` (auto-expand handled in component on mount)
- `toggleSurah`: immutable `Set` swap (new Set → add/delete)

### 2. `src/components/studio/PageList.tsx` — replace virtualized flat list
- Remove `react-window` (`List`, `useListRef`, `PageListItem`, `ITEM_HEIGHT`, `FIXED_HEADER_HEIGHT`)
- Add Arabic name map:
  ```ts
  const SURAH_NAMES_AR: Record<number, string> = {
    1:"الفاتحة",2:"البقرة",3:"آل عمران",4:"النساء",
    5:"المائدة",6:"الأنعام",7:"الأعراف",8:"الأنفال",9:"التوبة",
  };
  // fallback: `سورة ${surahNo}`
  ```
- Group `distribution` by `surah` via `useMemo`:
  ```ts
  Map<number, PageDistribution[]>  // insertion-ordered
  ```
- Search filter: match against Arabic OR Bengali name (lowercase, partial). Filter at **surah level** — matched surahs show all their pages when expanded.
- Render structure:
  ```text
  [surah header button]
    ▸/▾  ০১  الفاتحة  আল-ফাতিহা              [৭]
    └─ (when expanded) page rows (existing style, unchanged)
  ```
- Auto-expand logic (effect + initial state):
  - On mount: find `activeId`'s surah → `expandSurah(n)`
  - When `activeId` changes to a different surah → `expandSurah(newSurah)`
  - User can still collapse manually via toggle
- Keep existing: header, active-page indicator, page-number `<select>`, surah `<select>`, search input
- Container: `overflow-y-auto` (no virtualization)

---

## Acceptance criteria

- Surahs render as collapsible sections (chevron rotates)
- Search filters by surah name (AR or BN, partial, case-insensitive)
- Active page's surah auto-expands on mount and on navigation
- Clicking a page item still calls `onSelect(pageId)`
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0

## Commit
```
feat(Phase5): surah-grouped collapsible sidebar + Arabic+Bengali search
```

## Checker prompt for next loop
Phase 5 done → update `CONTINUE_PROMPT.txt`:
- Phase 5 → ✅ Done
- Next: Phase 6 — Keyboard shortcuts (Alt+1/2/3/4 → scope switch)
