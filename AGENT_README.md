# Agent Instructions — Quran Studio Pro

> **এই GitHub রিপোই এজেন্টের একমাত্র সোর্স।**  
> চ্যাটের পুরনো প্রম্পট নয় — নিচের ফাইল পড়ে কাজ করো → verify → **এই রিপোতেই push** করো।  
> **Plan শেষে:** `PLAN_COMPLETION_PROTOCOL.md` অনুযায়ী হ্যান্ডঅফ ফাইল আপডেট — তারপরই ✅।

---

## Repository

| | |
|---|---|
| **URL** | https://github.com/mraselpubg-crypto/quran-studio-pro.git |
| **Branch** | `main` |
| **Local path** | `c:\xampp\htdocs\q01\quran-studio-pro` |
| **Dev** | http://localhost:8080 → `npm run dev` |

---

## Git / GitHub Extension (Cursor / VS Code)

1. **Clone** (প্রথমবার):  
   Command Palette → `Git: Clone` →  
   `https://github.com/mraselpubg-crypto/quran-studio-pro.git`

2. **Sign in:** GitHub Extension দিয়ে লগইন (Settings → Accounts → GitHub)।  
   **PAT চ্যাটে, কোডে, বা handoff ফাইলে লিখবে না।**

3. **প্রতি সেশন শুরু:** Source Control → **Pull**  
   ```powershell
   git pull origin main
   ```

4. **কাজ শেষে:** stage → commit → **Push**  
   ```powershell
   git push origin main
   ```

5. **Remote URL** (token ছাড়া):  
   `https://github.com/mraselpubg-crypto/quran-studio-pro.git`

⚠️ Token চ্যাটে ফাঁস হলে GitHub → Settings → Developer settings → **Revoke** করো।

---

## কোন ফাইল কখন পড়বে

| ক্রম | ফাইল | বিবরণ |
|------|------|--------|
| **0** | **AGENT_README.md** | এই ফাইল — এন্ট্রি পয়েন্ট |
| 1 | **WORKING_AGENT_PROMPT.txt** | Copy-paste শুরু |
| 2 | **CONTINUE_PROMPT.txt** | মাস্টার: Plan, tasks, rules, git |
| 3 | **PLAN18_DESIGN.md** | Plan 18 architecture (current) |
| — | **PLAN17_DESIGN.md** | Plan 17 (done) |
| — | **PLAN_COMPLETION_PROTOCOL.md** | Plan done → ফাইল আপডেট নিয়ম |
| — | **PLAN16_AGENT_PROMPT.txt** | Plan 16 reflow (done — verify/re-implement) |
| 4 | AGENT_PROMPT.md | Legacy v2 — উপেক্ষা |

---

## প্রতি সেশনে করণীয়

```powershell
cd c:\xampp\htdocs\q01\quran-studio-pro
git pull origin main
npm install
npm run dev
```

কাজ শেষে:

```powershell
npx tsc --noEmit
npm run build
node scripts/verify-editor.mjs
node scripts/verify-reflow.mjs
git add -A
git commit -m "feat(Plan18): unify context page id and add active-page verify script"
git push origin main
```

তারপর **`CONTINUE_PROMPT.txt`** আপডেট (Plan ✅ + পরের Plan) → আবার commit + push।

**ক্রম:** `live → check → code → verify → commit → push`

---

## বর্তমান স্ট্যাটাস

| Plan | স্ট্যাটাস |
|------|-----------|
| Plan 14 | ✅ Scope reset + linking + history labels |
| Plan 16 | ✅ Area-Text auto reflow (`reflowScope`, `typographyReflow`) |
| **Plan 17** | ⬜ **এখন implement** — Active Page Context |
| Plan 18 | Stub — `CONTINUE_PROMPT.txt` |

বিস্তারিত: **`CONTINUE_PROMPT.txt`** → "Plan 17"

---

## Copy-paste প্রম্পট (অন্য এজেন্টকে দিন)

```
Repo: https://github.com/mraselpubg-crypto/quran-studio-pro.git
Branch: main

git pull origin main
রিপো root থেকে পড়ো (ক্রমে):
  AGENT_README.md
  WORKING_AGENT_PROMPT.txt
  CONTINUE_PROMPT.txt
  PLAN18_DESIGN.md

বর্তমান কাজ: Plan 18 (CONTINUE_PROMPT.txt)। Plan 17 done — পুনরায় করো না।

শেষে: tsc, build, verify-editor.mjs, verify-reflow.mjs, verify-active-page.mjs (after Plan 18)
git commit + git push origin main
CONTINUE_PROMPT.txt আপডেট (Plan 18 ✅) → আবার push

GitHub Extension / Credential Manager দিয়ে push করো — token ফাইলে/চ্যাটে নয়।
```

---

*Handoff files are in repo root — always pull before starting.*
