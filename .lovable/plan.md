## Phase 6 — Alt+1/2/3/4 Scope Shortcuts

### File to change (1)

**`src/components/studio/Workspace.tsx`** — Extend the existing `onKey` handler (around line 190, inside the keydown effect ending at line 255).

Add an early branch BEFORE the existing `switch (e.key.toLowerCase())` block:

```ts
// Alt+1/2/3/4 → switch editing scope
if (e.altKey && !e.ctrlKey && !e.metaKey && ["1","2","3","4"].includes(e.key)) {
  e.preventDefault();
  const map = {
    "1": { scope: "general" as const, label: "সাধারণ" },
    "2": { scope: "page"    as const, label: "পেজ" },
    "3": { scope: "surah"   as const, label: "সূরা" },
    "4": { scope: "global"  as const, label: "সকল" },
  };
  const pick = map[e.key as "1"|"2"|"3"|"4"];
  useEditorStore.getState().setScope(pick.scope);
  toast.success(`এডিটিং মোড পরিবর্তন: ${pick.label}`);
  return;
}
```

Add `import { toast } from "sonner";` at the top if missing.

### Notes

- Placed inside the existing window keydown effect — no new listener, no duplicate cleanup.
- `Alt+digit` doesn't conflict with text entry in contentEditable; `preventDefault` prevents browser tab/menu activation.
- Scope selectors in UI auto-sync via the Zustand store (already wired).
- No type changes needed — `SelectionScope` already includes all four values.

### Acceptance

- `Alt+1/2/3/4` updates scope and shows Bengali toast.
- `npx tsc --noEmit` exits 0.
- `npm run build` exits 0.

### Commit

`feat(Phase6): add Alt+1-4 keyboard shortcuts for scope switching`

### Checker/Fixer agent prompt (copy box for next loop)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║   Studio Al-Qalam — Checker & Next-Plan Agent Prompt                        ║
║   Repo: https://github.com/ohidgazi00003-gif/quran-studio-pro               ║
║   Branch: main (ALWAYS this repo)                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

RULES (NEVER break):
  1. Only branch: main. কখনো নতুন branch বানাবে না।
  2. git pull origin main → কাজ → git add -A && git commit -m "..." && git push origin main
  3. একটাই commit per loop। Force push নিষেধ।
  4. Lovable auto-generated files ছোঁবে না।
  5. প্রতিটি commit-এর আগে: npx tsc --noEmit (exit 0) + npm run build (exit 0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — Repo sync & verify Phase 6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  git pull origin main
  npm install
  npx tsc --noEmit    # must exit 0
  npm run build       # must exit 0

Verify Phase 6 in src/components/studio/Workspace.tsx:
  ✓ Alt+1 → setScope("general") + toast "সাধারণ"
  ✓ Alt+2 → setScope("page")    + toast "পেজ"
  ✓ Alt+3 → setScope("surah")   + toast "সূরা"
  ✓ Alt+4 → setScope("global")  + toast "সকল"
  ✓ e.preventDefault() called
  ✓ Handler placed inside existing window keydown effect (no duplicate listener)
  ✓ `import { toast } from "sonner"` present

If any check fails → fix in single commit:
  "fix(Phase6): <description>"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7 — Per-word Typography Overrides  [NEXT TASK if Phase 6 OK]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read first:
  src/state/overridesStore.ts
  src/components/studio/WordBlock.tsx
  src/components/studio/Inspector.tsx (or PropertiesPanel.tsx)

Goal: Allow per-word font-size / letter-spacing / color overrides
that respect the active SelectionScope (general/page/surah/global).

Changes required:
  1. Extend overridesStore with word-level patch keyed by
     `${pageId}:${rowIndex}:${wordIndex}` (general scope) and
     scope-aware lookups for page/surah/global.
  2. WordBlock reads merged override (general > word-in-scope > base).
  3. Inspector "Word" tab shows font-size / letter-spacing / color
     inputs when selection.kind === "word". Writes use current scope.
  4. ScopeImpactWarningDialog triggers when scope ≠ "general" and
     the change affects >50 elements.

ACCEPTANCE:
  ✓ Selecting a word + changing size in scope=page updates all words on that page
  ✓ scope=surah updates all words in that surah
  ✓ scope=global updates everywhere; warning dialog appears
  ✓ scope=general only updates the single word
  ✓ npx tsc --noEmit exits 0
  ✓ npm run build exits 0

Commit: "feat(Phase7): per-word typography overrides with scope awareness"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENDING AFTER PHASE 7
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Phase 8 — Mobile Edit Mode
```
