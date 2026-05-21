## TASK 7 — Chunked Page Building (progress UI + non-blocking rebuild)

### লক্ষ্য
`buildAllPages()` বর্তমানে synchronous — ১৭৪০ পেজ build করতে ~১৫০-২৫০ms main thread block করে। Slider drag বা scope পরিবর্তনের সময় visible jank তৈরি হয়। এই কাজে আমরা build প্রক্রিয়াকে chunk-এ ভাগ করব, idle-frame-এ process করব, এবং progress UI দেখাব।

### Scope
শুধু `src/data/pages.ts` এবং `src/state/reflowStore.ts`। অন্য component (PageList, PropertiesPanel) অপরিবর্তিত — তারা শুধু `useReflowStore`-এর `pages` array এবং `buildProgress` ব্যবহার করে।

---

### পরিবর্তন ১ — `src/data/pages.ts`: chunked async builder

`buildAllPages()` কে অপরিবর্তিত রাখব (back-compat-এর জন্য), এবং পাশাপাশি নতুন function যোগ করব:

```ts
export type ChunkProgress = { done: number; total: number; label: string };

export async function buildAllPagesChunked(
  opts: BuildOpts = {},
  onProgress?: (p: ChunkProgress) => void,
  signal?: AbortSignal,
): Promise<PageData[]>
```

কাজের ধাপ:
1. Fatiha পেজগুলো instantly build (১ surah, sync ঠিক আছে)।
2. `cachedVerses` কে surah-group-এ split করব (existing `groupBySurah` logic ব্যবহার করে, refactor করে export করব)।
3. প্রতি **৫ surah group**-এর জন্য একটি chunk — `buildPagesFromVerses()` কে surah-group-subset-এ চালাব এবং result merge করব।
4. প্রতি chunk-এর পর `await scheduleIdle()` (requestIdleCallback wrapper, fallback `setTimeout(0)`) — main thread free হয়।
5. প্রতি chunk শেষে `onProgress({ done, total, label: \`পেজ \${done}/\${total} তৈরি হচ্ছে…\` })` call।
6. `signal?.aborted` check — abort হলে throw করে stale rebuild বাতিল।

**গুরুত্বপূর্ণ:** `buildPagesFromVerses()` বর্তমানে cross-surah page numbering করে (একই পেজে দুটি সূরা থাকতে পারে)। তাই pure per-surah chunking ভুল হবে — পরিবর্তে আমরা পুরো verses array-কে একবারই pack করব কিন্তু **inner loop**-এ surah-group iteration-এর মধ্যে `await yieldIfNeeded()` insert করব। এটাই সবচেয়ে safe approach।

বাস্তবায়ন: `buildPagesFromVerses()`-এর async variant `buildPagesFromVersesChunked()` তৈরি — একই output, কিন্তু surah-group loop-এর প্রতি ৫টি group-এর পরে yield।

---

### পরিবর্তন ২ — `src/state/reflowStore.ts`: rebuild() async + AbortController

বর্তমানে `rebuild()` synchronous, একবার `requestIdleCallback`-এ wrap করা। এটিকে replace করব:

```ts
rebuild: () => {
  // Cancel any in-flight rebuild
  currentAbort?.abort();
  const abort = new AbortController();
  currentAbort = abort;

  const opts = { /* same as today */ };
  const sig = computeSignature();
  set({ rebuilding: true });

  buildAllPagesChunked(opts, (p) => {
    set({
      buildProgress: {
        label: p.label,
        pct: Math.round((p.done / p.total) * 100),
      },
    });
  }, abort.signal)
    .then((pages) => {
      if (abort.signal.aborted) return;
      if (sig !== computeSignature()) return; // stale
      set({
        pages,
        distribution: computeDistribution(pages),
        signature: sig,
        rebuilding: false,
        buildProgress: null,
      });
    })
    .catch((e) => {
      if (e?.name === "AbortError") return;
      console.error("[reflow] rebuild failed", e);
      set({ rebuilding: false, buildProgress: null });
    });
},
```

`rebuildPage(pageId)` (optimistic single-page) অপরিবর্তিত — সেটি ইতিমধ্যে fast।

`init()`-এর "Stage 3" call (`get().rebuild()`)-ও async chunked path দিয়ে যাবে, ফলে app-load-এর সময়ও জার্ক হবে না এবং existing `buildProgress` UI আরও smooth progress দেখাবে।

---

### পরিবর্তন ৩ — Progress UI (already exists)

`buildProgress: { label, pct }` ইতিমধ্যে store-এ আছে এবং কোথাও না কোথাও render হচ্ছে (init-এর সময়)। Chunked rebuild-এর সময়েও একই state update হবে — কোনো নতুন UI component দরকার নেই। শুধু verify করব যে progress component `rebuilding === true && buildProgress != null` condition-এ visible থাকে।

যদি progress overlay কোথাও না-ই থাকে, ছোট একটি bottom-right toast (`fixed bottom-4 right-4`) যোগ করব যেটি `buildProgress`-এ পড়ে এবং rebuilding-এর সময় দেখায়।

---

### Technical details (developer-facing)

- **Chunk size:** ৫ surah group ≈ ৫-৩০ পেজ/chunk → প্রতি chunk ~১০-২০ms work, idle-callback-এ comfortably fit।
- **AbortController:** stale rebuild (user drags slider rapidly) বাতিল করে — শুধু সর্বশেষ rebuild-এর result commit হয়।
- **`scheduleIdle` helper:** existing pattern থেকে নেওয়া (`reflowStore.ts:155-163`), একটি Promise-returning version করব।
- **No breaking changes:** `buildAllPages()` sync export রয়ে যায় (`BrowserDAL`, `getAllPages` সেটি ব্যবহার করে — তারা one-shot full build চায়, async OK তবে scope বাইরে)।
- **TypeScript:** `npx tsc --noEmit` clean থাকতে হবে।

### যাচাইকরণ চেকলিস্ট

- [ ] Slider drag করার সময় UI freeze হয় না (300ms+ frame nei)
- [ ] Rebuild চলাকালে `buildProgress` update হয় (label + pct)
- [ ] দ্রুত পরপর slider move → শুধু শেষেরটার result apply হয় (AbortController কাজ করছে)
- [ ] App load (init) এ progress smooth ৫→৪০→৭০→১০০ যায়
- [ ] Final pages array আগের sync build-এর সাথে identical (page count, ids, line content)
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` exit 0

### Out of scope (পরের কাজ)

- TASK 8 — Tajweed icon font (.woff2) — user-confirmation দরকার
- `pages_meta` SQLite table populate — Electron-side optimization
- Web Worker-based build — যদি chunked যথেষ্ট না হয়, পরের iteration-এ