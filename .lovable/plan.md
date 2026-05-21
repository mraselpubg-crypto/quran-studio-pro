# Plan #4 — Critical Bug Fix: Scope Fan-out + Font Size Display

## Changes
1. **`src/components/studio/PropertiesPanel.tsx` → `DSlider`**: refactored with explicit `selKey` and `isLocalScope` checks; `applyValue`/`resetValue` call `setDragging(null)` first, then route to `setGlobal` (no selection / global scope) or `patchScoped(selKey, …, scope)` (local/page/surah).
2. **`CharacterPanel`**: `fontPx` now falls back to global `arabicFontPx`/`banglaFontPx` (or `ARABIC_FONT_PX`/`BANGLA_FONT_PX`) when no local override exists — fixes "845" display when value should be 45/50.

## Verification
- `npx tsc --noEmit` clean.
- "সাধারণ" scope: single layer affected.
- "পেজ" scope: only that page's matching layers patched via `patchScoped` fan-out.
- "সূরা" scope: only that surah's pages.
- "সকল" scope: all pages.
- CharacterPanel Font Size shows correct value (not 845).

## Previous plans (archive)
- Plan #1: প্রয়োগ
- Plan #2: History Panel + Quick Publish Modal
- Plan #3: Audit fixes — scope-aware history fan-out + scope-aware scopeLabel + print isolation
