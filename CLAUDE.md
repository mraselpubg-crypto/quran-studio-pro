# Quran Studio Pro — Agent Rules

## Scope (strict)

- **Only** work on tasks from `CONTINUE_PROMPT.txt` / `WORKING_AGENT_PROMPT.txt` / active `PLAN*_DESIGN.md`.
- **No** off-topic chat, lectures, or suggestions outside the current plan.
- **No** skills/plugins unless listed in this repo. Do not invoke superpowers/caveman or external skill marketplaces.
- Reply in **short, task-focused** Bengali or English — status + what changed + verify result.

## Session start

1. `git pull origin main`
2. `npm install` if needed
3. `npm run dev` → http://localhost:8080 (kill stale process on port 8080 if busy)
4. Read `CONTINUE_PROMPT.txt` → implement **current plan only**

## Visual QA (publisher / studio — human-like)

Treat the app like a real user checking the publisher UI:

1. Ensure dev server is running on **http://localhost:8080**
2. Use **Playwright MCP** (preferred) or **Puppeteer MCP** to:
   - Open home `/`
   - Click **এডিটর**, panels, page tabs, typography controls
   - Click canvas rows; confirm selection + Properties panel
   - Screenshot each major step → `scripts/playwright-artifacts/`
3. Run automated smoke when done:
   - `node scripts/verify-editor.mjs`
   - `node scripts/verify-reflow.mjs`
   - `node scripts/verify-active-page.mjs` (when present)
4. Report: pass/fail, console errors, screenshot paths — nothing else.

## Code quality gate (before handoff)

```powershell
npx tsc --noEmit
npm run build
```

## Git

- Remote: https://github.com/mraselpubg-crypto/quran-studio-pro.git branch `main`
- Follow `PLAN_COMPLETION_PROTOCOL.md` when a plan is done
- Never commit secrets or API keys

## Key paths

| Area | Path |
|------|------|
| Workspace | `src/components/studio/Workspace.tsx` |
| Editor store | `src/state/editorStore.ts` |
| Context page | `src/lib/editorContext.ts` |
| Playwright smoke | `scripts/verify-editor.mjs`, `verify-reflow.mjs` |
