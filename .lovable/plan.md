# Plan #5 — Fix History Chip + Quick Publish Modal

## Changes
1. **`src/components/studio/CanvasToolbar.tsx`** — `HistoryItem` now renders `scopeLabel` chip (📍 পেজ N · সারি M) when available, falling back to raw pageId.
2. **`src/components/studio/QuickPublishModal.tsx`** — modal is now portaled into `document.body` via `createPortal`, so no parent z-index/overflow can hide it when ⚡ is clicked.

## Verification
- `npx tsc --noEmit` clean.
- History entries from page/general scope display scope chip in both PropertiesPanel HistoryTab and CanvasToolbar history dropdown.
- ⚡ Quick Publish button opens modal reliably; backdrop & X close it; print respects page range (from Plan #3).

## Previous plans (archive)
- Plan #1: প্রয়োগ
- Plan #2: History Panel + Quick Publish Modal
- Plan #3: Audit fixes — scope-aware fan-out + scopeLabel + print isolation
- Plan #4: Scope fan-out routing + CharacterPanel fontPx fallback
