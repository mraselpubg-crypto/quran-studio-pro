# Plan #3 — Plan #1 + #2 Audit Fixes

Plan #1 ("প্রয়োগ") + Plan #2 (History + Quick Publish) এক্সিকিউট করার পর codebase scan-এ ৩টি বাস্তব বাগ পাওয়া গেছে। সবগুলো এক plan-এ ঠিক করা হবে।

## Issue 1 — History scope সব সময় "general" + fan-out noise (Critical)

**বাগ:** `src/state/overridesStore.ts` line 129-এ `patchLocal` ভেতরে hard-coded `scope = "general"` দিয়ে `captureHistory` কল হয়। ফলে:
- "পেজ" বা "সূরা" scope-এ একটা slider drag → `patchScoped` দশ-শত layerKey-তে fan-out করে → প্রতিটা `patchLocal` আলাদা history entry তৈরি করে, সবগুলো ভুল করে "সাধারণ" badge দেখায়।
- HistoryTab অপাঠ্য হয়ে যায়, restore ভুল scope-এ প্রয়োগ হয়।

**ফিক্স:**
1. `patchLocal`-এ একটা optional `__suppressHistory` flag pattern: একটা module-local counter `_suppressFanout` যোগ — `patchScoped`-এর fan-out loop চলাকালে `beginSilent()/endSilent()` (`historyStore` থেকে import) wrap করে দাও, যাতে individual `patchLocal` কোনো entry তৈরি না করে।
2. `patchScoped`-এর শেষে **একটাই** synthetic history entry push: একই `mainField`, `before` = representativeKey-এর আগের value, `after` = patch value, real `scope` (`scope` param যেমন এসেছে: `general`/`page`/`surah`/`global`), `pageId`/`rowIndex` representativeKey থেকে parsed।
3. `setGlobal` থেকে আসা history entries (line 101) অপরিবর্তিত — সেগুলো ইতোমধ্যে সঠিক scope "global" পায়।

## Issue 2 — scopeLabel non-general scope-এ ভুল context দেখায়

**বাগ:** Plan #2-এ `scopeLabel` সর্বদা `"পেজ N · সারি M"` ফরম্যাটে generate হয়। কিন্তু:
- `scope === "page"` হলে label হওয়া উচিত শুধু `"পেজ N"` (সারি প্রাসঙ্গিক নয়)।
- `scope === "surah"` হলে label হওয়া উচিত `"সূরা K"` (representative page নয়)।
- `scope === "global"` হলে কোনো label নয়।

**ফিক্স:** `captureHistory` (`src/state/historyStore.ts`)-এ `scopeLabel` derivation switch-by-scope:
```ts
let scopeLabel = "";
if (scope === "page" && pageId) {
  scopeLabel = `পেজ ${pageId.replace(/^vpage-/, "")}`;
} else if (scope === "surah" && pageId) {
  // dynamic import to avoid circular dep
  const { useReflowStore } = await import("./reflowStore"); // already async-thenable in current code
  const surah = useReflowStore.getState().distribution.find((d) => d.pageId === pageId)?.surah;
  scopeLabel = surah ? `সূরা ${surah}` : `পেজ ${pageId.replace(/^vpage-/, "")}`;
} else if (pageId) {
  // general / fallback
  scopeLabel = `পেজ ${pageId.replace(/^vpage-/, "")}`;
  if (rowIndex !== undefined) scopeLabel += ` · সারি ${rowIndex + 1}`;
}
```
(`reflowStore` import সিন্ক্রোনাস ব্যবহার করা যাবে — already loaded by app boot। তবে `historyStore` → `reflowStore` direct import circular risk-এর জন্য existing dynamic-import inside the `.then` block-এই করব।)

## Issue 3 — Quick Publish পুরো UI প্রিন্ট করে, page-range কাজ করে না (Important)

**বাগ:** Plan #2 modal `window.print()` কল করে কিন্তু:
- কোনো `@media print` CSS নেই → sidebar, TopBar, properties panel সব print হয়।
- `print-range` localStorage-এ লেখা হয় কিন্তু কেউ পড়ে না।

**ফিক্স:**

### 3a. `src/components/studio/Artboard.tsx`
Root `<div>` (line 281)-এ marker attrs যোগ:
```tsx
data-artboard="true"
data-page-num={page.pageNum ?? page.id.replace(/^vpage-/, "")}
```
(`PageData`-এ `pageNum` field থাকলে সেটা use, না হলে id থেকে parse)।

### 3b. `src/components/studio/QuickPublishModal.tsx`
`handlePrint`-এ `window.print()` কলের আগে DOM-এ range apply:
```ts
const allBoards = document.querySelectorAll<HTMLElement>('[data-artboard="true"]');
allBoards.forEach((el) => {
  const n = Number(el.getAttribute("data-page-num") ?? 0);
  el.dataset.printSkip = (n < fromPage || n > toPage) ? "true" : "false";
});
```
print-এর পরে cleanup: `window.addEventListener("afterprint", () => { allBoards.forEach((el) => delete el.dataset.printSkip); }, { once: true });`

### 3c. `src/styles.css`
নতুন print block append:
```css
@media print {
  @page { size: A4; margin: 0; }
  body * { visibility: hidden !important; }
  [data-artboard="true"], [data-artboard="true"] * { visibility: visible !important; }
  [data-artboard="true"] {
    position: relative !important;
    page-break-after: always;
    margin: 0 !important;
    box-shadow: none !important;
  }
  [data-artboard="true"][data-print-skip="true"] { display: none !important; }
}
```

## Files touched
- `src/state/overridesStore.ts` — `patchScoped` fan-out wrap + synthetic history entry; বা alternatively new param-based suppression
- `src/state/historyStore.ts` — scope-aware `scopeLabel` derivation
- `src/components/studio/Artboard.tsx` — `data-artboard` + `data-page-num` attrs
- `src/components/studio/QuickPublishModal.tsx` — range → DOM marker before/after print
- `src/styles.css` — `@media print` rules
- `.lovable/plan.md` — execute-এর পর এই plan archive

## যাচাই
1. `npx tsc --noEmit` clean।
2. Preview:
   - Scope = "সূরা" → Arabic font-size slider drag → HistoryTab-এ **একটাই** entry, badge="সূরা", scopeLabel="সূরা K"।
   - Scope = "পেজ" → entry: badge="পেজ", scopeLabel="পেজ N"।
   - Scope = "সাধারণ"/single layer → entry: badge="সাধারণ", scopeLabel="পেজ N · সারি M"।
3. Quick Publish modal → range ১–৩ → প্রিন্ট preview-এ শুধু আর্টবোর্ড ১–৩ দেখায়, sidebar/topbar hidden।
4. Restore button আগের মতোই কাজ করে (single representative key patch reverses)।
