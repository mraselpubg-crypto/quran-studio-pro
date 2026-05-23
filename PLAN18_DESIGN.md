# Plan 18 — Context Page Unification + Active-Page Verify

## Goal

After Plan 17, `getContextPageId()` in `src/lib/editorContext.ts` is the canonical page id for scoped UI ops. Plan 18 wires that helper into remaining fallbacks and adds Playwright coverage.

## Scope

| Area | Change |
|------|--------|
| `reflowScope.ts` | Use `getContextPageId()` where page scope lacks explicit `pageId` |
| `typographyReflow.ts` | Same for typography patch fallbacks |
| `scripts/verify-active-page.mjs` | New: page 2 visible, no selection, page reset smoke |

## Out of scope

- Changing reflow engine boundaries (`effectiveReflowScope` rules)
- New editor features beyond fallback unification

## Verification

```powershell
npx tsc --noEmit
npm run build
npm run dev   # port 8080
node scripts/verify-active-page.mjs
node scripts/verify-editor.mjs
node scripts/verify-reflow.mjs
```

## Commit

```
feat(Plan18): unify context page id and add active-page verify script
```
