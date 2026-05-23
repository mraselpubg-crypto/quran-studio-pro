## Plan 11 — UI/UX Improvements (4 features)

### Step 0 — Repo sync & sanity
`git pull origin main` → `npm install` → `npx tsc --noEmit` → `npm run build` (all must pass) before any edits.

---

### Feature 1: In-app "সব রিসেট করুন" confirm dialog

**File:** `src/components/studio/PropertiesPanel.tsx` (replace the `window.confirm` in `ResetGroup`).

- Add a new local component `ResetConfirmDialog` built on the existing `AlertDialog` primitives (same pattern as `ScopeImpactWarningDialog.tsx`).
- Scope-aware body text (read current `scope` from `useEditorStore`):
  - `general`: "এই নির্বাচনের সেটিং রিসেট হবে"
  - `page`: "এই পেজের সব সেটিং রিসেট হবে"
  - `surah`: "এই সূরার সব সেটিং রিসেট হবে"
  - `global`: "সম্পূর্ণ মুসহাফের সব সেটিং রিসেট হবে ⚠️" (red emphasis)
- Buttons: "হ্যাঁ, রিসেট করুন" (destructive variant) + "বাতিল" (cancel).
- Confirming runs the existing `resetAll()` + `rebuild()` + history clear flow that lives inline today.

---

### Feature 2: Per-row 3-layer Y-offset movement (Symbol / Arabic / Bengali)

**Data model — `src/state/overridesStore.ts`:**
- Re-use the existing `layerKey(pageId, rowIndex, "arabic"|"bangla"|"symbol")` (already implemented & rendered).
- Store offsets in the existing `LocalOverride.dy` field for arabic/bangla layer keys, and for symbol create a `layer:{pageId}:{rowIndex}:symbol` entry — also `dy`.
- Extend `FabricLines.tsx` so the **symbol strip** subscribes to `s.local[layerKey(pageId,i,"symbol")]` (today `gSymbolY` is the only source) and adds `symOv.dy` to its `translateY`. Arabic + Bangla layers already render `aDy`/(no bDy yet) — add `bDy = bOv?.dy ?? 0` to the bangla `translateY`.

**UI — `PropertiesPanel.tsx`:** add `SubLayerPanel` (rendered when `selection?.kind === "row"`, regardless of tool, since the spec says "Move tool active") with:
- Three pill toggles: 🔣 প্রতীক | ع আরবি | ক বাংলা — switches a local `activeSub` state.
- A single Y-offset slider (min -30, max 30) that reads/writes `layerKey(pageId, rowIndex, activeSub).dy` via `patchScoped` (scope-aware).
- Reset button per sub-layer (clears that key's `dy`).

---

### Feature 3: Paragraph Linking System

**State:** new tiny store `src/state/linkingStore.ts` with persisted booleans `{ arabic, bangla, symbol }` (default all `false`).

**UI — `PropertiesPanel.tsx` (new `LinkingPanel` section, just below `SubLayerPanel`):**
- Three switches (shadcn `Switch`): 🔗 আরবি / 🔗 বাংলা / 🔗 প্রতীক.
- "সব লিংক" button toggles all three at once.

**Behaviour — in the sub-layer slider apply path (Feature 2):**
- When linking is ON for the active sub-layer, override the user-selected `scope` with the link-implied fan-out by calling `patchScoped(layerKey(...), { dy }, scope)` for the linked layer's pages/rows already governed by scope (general/page/surah/global). When OFF, apply only to the current row.
- Concretely: if `link.arabic` is on AND `scope === "page"`, the patch propagates to every row on the page via the existing `getScopedLayerKeys` "layer" branch. (Already supported — we just route through `patchScoped` instead of `patchLocal`.)

---

### Feature 4: Save button + auto-save toggle in header

**File:** `src/components/studio/TopBar.tsx`.

- New `<SaveButton />` rendered only when `editMode === true`, placed next to the Preview/Editor `NavPill`s.
- Button label: "💾 সেভ". On click:
  - Force-flush Zustand persist by calling `useOverridesStore.persist.rehydrate()` is not needed (writes are sync). Implement as `useOverridesStore.getState()` then write a manual `localStorage.setItem("studio-save-ts", Date.now())` for indicator + show `toast.success("✅ সেভ সম্পন্ন হয়েছে")`.
- Unsaved-changes indicator: track a module-level `dirtySince` ref that flips true on `useOverridesStore.subscribe` (any change) and resets on save. Yellow dot shown when dirty.
- Chevron button next to it opens a small popover (use shadcn `DropdownMenu`):
  - "🔄 অটো সেভ" `Switch` — persists to `localStorage.autoSave`. When on, a `setInterval(save, 30000)` is registered.
  - "📋 ম্যানুয়াল সেভ" menu item triggers save.
- When auto-save is on, render a small "অটো সেভ চালু" label next to the button.

---

### Step N — Verify & commit
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
- Commit: `feat(Plan11): in-app reset dialog, sub-layer movement, linking system, save button`
- Push to `main`.

---

### Files touched
- `src/components/studio/PropertiesPanel.tsx` — reset dialog, SubLayerPanel, LinkingPanel
- `src/components/studio/FabricLines.tsx` — read symbol/bangla layer `dy`
- `src/state/overridesStore.ts` — (no schema change; reuse `layer:` keys + `dy`)
- `src/state/linkingStore.ts` — NEW
- `src/components/studio/TopBar.tsx` — Save button + dropdown + auto-save
- `.lovable/plan.md` — mark Plan 11 done, list Plan 12 (Advanced Export)

### Checker prompt (next loop)
Provided in chat reply after the build commit.

---

## ✅ Plan 11 — COMPLETED (2026-05-23)

- In-app scope-aware reset dialog (no more `window.confirm`)
- Per-row Symbol/Arabic/Bengali sub-layer Y-offset sliders
- Linking toggles (arabic/bangla/symbol) with scope-aware fan-out via `patchScoped`
- Header Save button + chevron dropdown with Auto-save toggle (30s interval)

PENDING:
- Plan 12 — Advanced Exporting (PDF & Image Generation)
