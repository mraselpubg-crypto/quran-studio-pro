# Plan #2 — History Panel উন্নতি + Quick Publish Modal

(Plan #1 ছিল "প্রয়োগ সিস্টেম পুনর্গঠন" — সম্পন্ন।)

## A. History Panel — scopeLabel

### A1. `src/state/historyStore.ts`
- `HistoryEntry` type-এ optional `scopeLabel?: string` field যোগ।
- `captureHistory()`-এ:
  ```ts
  let scopeLabel = "";
  if (pageId) {
    const pageNum = pageId.replace(/^vpage-/, "");
    scopeLabel = `পেজ ${pageNum}`;
    if (rowIndex !== undefined) scopeLabel += ` · সারি ${rowIndex + 1}`;
  }
  ```
  এবং `useHistoryStore.getState().push({...})` payload-এ `scopeLabel` pass।
- Persist migration (`merge`)-এ legacy entry-গুলোর জন্য `scopeLabel` reconstruct: যদি `e.pageId` থাকে একই formula দিয়ে derive; না থাকলে `""`।

### A2. `src/components/studio/PropertiesPanel.tsx` (HistoryTab, lines 180-201)
- `relativeTime(entry.ts)` span-এর আগে conditional চিপ:
  ```tsx
  {entry.scopeLabel && (
    <span className="rounded-sm bg-neutral-800 px-1.5 py-0.5 text-[9px] text-neutral-400">
      {entry.scopeLabel}
    </span>
  )}
  ```
- Header row layout: scope badge (বাম) | {scopeLabel chip + relativeTime} (ডান, `flex items-center gap-1.5`)।

কোনো restore-logic পরিবর্তন নেই; existing `restoreTo()` অপরিবর্তিত (perf-optimization scope বাইরে)।

## B. Quick Publish Modal

### B1. নতুন `src/components/studio/QuickPublishModal.tsx`
- Props: `{ open: boolean; onClose: () => void }`.
- State: `fromPage`, `toPage` (init `1` ও `totalPages`), `exporting`.
- `totalPages = useReflowStore(s => s.pages.length)`.
- Backdrop click + X button → `onClose()`.
- "সব পেজ" / "প্রথম ৩০" quick-select buttons (৩০ > totalPages হলে clamp)।
- `handlePrint()`:
  - `localStorage.setItem("print-range", JSON.stringify({ from, to }))`
  - `setExporting(true)` → `setTimeout(() => { window.print(); setExporting(false); onClose(); }, 200)`.
- Dark theme, amber accent — TopBar modal style matched।
- Inputs: `type="number"`, `min={1}`, `max={totalPages}`, clamp on change।
- Disabled state: `exporting || fromPage > toPage || totalPages === 0`।

### B2. `src/components/studio/TopBar.tsx`
- Imports যোগ: `useState` (যদি না থাকে) + `QuickPublishModal`।
- Component-এ: `const [publishOpen, setPublishOpen] = useState(false);`
- Line 188-194 button-এ `onClick={() => setPublishOpen(true)}`।
- Header close-এর পর: `<QuickPublishModal open={publishOpen} onClose={() => setPublishOpen(false)} />`।

(Print CSS `@media print` কোনো বিদ্যমান artboard-only style এই plan-এ নেই — `window.print()` browser default behavior ব্যবহার হবে; প্রকৃত page-range filter পরবর্তী plan-এ। এই plan শুধু modal UI + handler wiring।)

## C. যাচাই
1. `npx tsc --noEmit` → 0 errors।
2. Preview: History tab-এ পেজ-scoped change করলে "পেজ N · সারি M" chip দেখায়।
3. TopBar ⚡ ক্লিক → modal খোলে; range edit → "PDF/প্রিন্ট" → browser print dialog।
4. Backdrop / X ক্লিক → modal বন্ধ।

## D. Plan archival নিয়ম
এই plan execute করার পর `.lovable/plan.md`-এ এই plan-এর content overwrite করে রাখা হবে (user instruction: "every time after execution add in codebase your last plan")। ভবিষ্যতের প্রতিটি plan execute-এর পরেও একই কাজ।

## Files touched
- `src/state/historyStore.ts` (edit)
- `src/components/studio/PropertiesPanel.tsx` (edit, HistoryTab only)
- `src/components/studio/QuickPublishModal.tsx` (new)
- `src/components/studio/TopBar.tsx` (edit, ⚡ button + modal mount)
- `.lovable/plan.md` (overwrite after execution)
