# Plan 13 — Dynamic Paragraph Linking: Scope-Aware Tool Integration

Wire the existing `useLinkingStore` + `effectiveScope()` primitives into the user-visible UI so the Linking switch becomes (a) visible per layer, (b) tool-aware (Move + Type), and (c) cross-layer-safe.

No new dependencies. No new state shape. We fix a real bug in propagation by deriving the layer from the **slider's target**, not only from `selection.layerKind`.

---

## Files modified (3)

```text
src/components/studio/PropertiesPanel.tsx   (LinkingPanel + DSlider + CharacterPanel)
src/state/overridesStore.ts                 (sync helper for layer→scope gating)
src/state/editorStore.ts                    (no shape change — verify only)
```

No file creations, no schema changes.

---

## Part A — Derive the correct "layer" for each edit

Today every call site passes `selection?.layerKind ?? null` to `effectiveScope`. Problem: when the user clicks a **row** (not a sub-layer), `layerKind` is `undefined`, so `effectiveScope` returns the raw scope and the Linking switches are ignored entirely. Also, the **Arabic font slider** should always be gated by the arabic switch even if the user selected the bangla sub-layer.

Fix: introduce a tiny helper that maps each slider/control to its semantic layer.

```ts
// in PropertiesPanel.tsx (local helper)
type LinkLayer = "arabic" | "bangla" | "symbol";
const KEY_TO_LAYER: Partial<Record<keyof GlobalOverrides, LinkLayer>> = {
  arabicFontPx: "arabic",
  arabicYOffset: "arabic",
  banglaFontPx: "bangla",
  banglaYOffset: "bangla",
  symbolYOffset: "symbol",
};
```

`DSlider` then resolves the layer as `KEY_TO_LAYER[k] ?? selection?.layerKind ?? null` before calling `effectiveScope`. This guarantees:
- Arabic font slider → always gated by `linking.arabic`
- Bangla Y slider → always gated by `linking.bangla`
- Generic transform (`LocalFields` dx/dy) → uses `selection.layerKind`, falling back to `scope` when row-level

For `LocalFields` (Move tool dx/dy) we keep `selection.layerKind`; when the user clicks a whole row (no sub-layer), we treat it as "all three layers" and gate using **logical AND** of the three switches — meaning the propagation only fans out if **all** are linked. This is the safe interpretation that matches the user's requirement "If Arabic linking is ON and Bangla linking is OFF: Bangla changes only affect current row."

Helper added in `overridesStore.ts`:

```ts
export async function effectiveScopeForRow(scope: SelectionScope): Promise<SelectionScope> {
  const { useLinkingStore } = await import("./linkingStore");
  const s = useLinkingStore.getState();
  return s.arabic && s.bangla && s.symbol ? scope : "general";
}
```

`LocalFields.apply()` calls this when `selection.layerKind == null`, and `effectiveScope(scope, layerKind)` otherwise.

---

## Part B — Visual feedback in `LinkingPanel`

Update the panel so each row shows the **currently active scope** as a colored badge and a glow when ON.

```tsx
function LinkingPanel() {
  const { arabic, bangla, symbol, setLink, setAll } = useLinkingStore();
  const scope = useEditorStore((s) => s.scope);
  const meta = SCOPE_META[scope];
  const ScopeIcon = meta.icon;
  const allOn = arabic && bangla && symbol;

  const rows: Array<[LinkLayer, string]> = [
    ["arabic", "আরবি লিংক"],
    ["bangla", "বাংলা লিংক"],
    ["symbol", "প্রতীক লিংক"],
  ];

  return (
    <div className="...violet container...">
      <header>প্যারাগ্রাফ লিংকিং  ·  <button setAll>...</button></header>

      {rows.map(([k, label]) => {
        const on = { arabic, bangla, symbol }[k];
        return (
          <label
            className="..."
            style={on ? { boxShadow: `0 0 0 1px ${meta.color}55`, background: `${meta.color}10` } : undefined}
          >
            <span className="flex items-center gap-1.5">
              {on ? "🔗" : "⛓️‍💥"} {label}
              {on && (
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  <ScopeIcon className="h-2.5 w-2.5 inline mr-0.5" />
                  {meta.labelBn}
                </span>
              )}
            </span>
            <Switch checked={on} onCheckedChange={(v) => setLink(k, v)} />
          </label>
        );
      })}
    </div>
  );
}
```

Result: a green "সকল" badge next to "আরবি লিংক" tells the user that arabic edits will fan out globally; turning the switch off removes the glow and the badge.

---

## Part C — Tool-aware propagation indicator on `DSlider`

Add a small linked/unlinked icon next to the slider label that reflects whether **this** slider is currently going to fan out, given (scope, layer, switch). Pure visual — drives off the same `effectiveScope` decision.

```tsx
// inside DSlider, after we know `layerForGate`
const linked = useLinkingStore((s) => layerForGate ? s[layerForGate] : false);
const willFanOut = scope !== "general" && linked;
// render <Link2 /> in violet when willFanOut, otherwise dimmed
```

This makes the **Type Tool** (font/Y sliders) and the **Move Tool** (`LocalFields` dx/dy) both surface the same single-source-of-truth answer: "is this edit going to propagate?".

`LocalFields` gets the same icon, computed from `effectiveScopeForRow` decision (all three linked) when `layerKind` is null.

---

## Part D — Verify `editorStore.selection.layerKind` is set on sub-layer clicks

`FabricLines.tsx` already sets `layerKind: "arabic"` and `layerKind: "bangla"` on the two sub-layer click handlers (lines 290 and 373). Verify the symbol-layer click also writes `layerKind: "symbol"`; if missing, add it in the same click handler that produces `kind: "layer"` for the symbol element. No store-shape changes; `Selection.layerKind` already accepts `"symbol"`.

---

## Acceptance criteria

- Click **arabic** sub-layer → turn **Arabic Link** ON → scope=**সূরা** → drag Arabic font slider → all arabic rows of that surah update; bangla/symbol unchanged.
- Same setup, switch OFF → only the selected arabic row updates.
- Bangla switch OFF + Arabic switch ON → adjusting bangla Y slider only touches the local row, even with scope=সূরা.
- Symbol switch behaves identically and independently.
- `LinkingPanel` shows the active scope badge (with `SCOPE_META` color) next to each ON switch; OFF switches show no badge and no glow.
- Each `DSlider` shows a violet `Link2` icon when its edit will fan out; dimmed otherwise.
- Move tool dx/dy on a whole-row selection only fans out when **all three** layer switches are ON (safe default).
- `npx tsc --noEmit` exits 0 and `npm run build` exits 0.

Commit: `feat(Plan13): scope-aware linking UI, tool-aware propagation, layer protection`
