# Agent Instructions — Quran Studio Pro

> **এই GitHub রিপোই এজেন্টের একমাত্র সোর্স।**  
> চ্যাটের পুরনো প্রম্পট নয় — নিচের ফাইল পড়ে কাজ করো → verify → **এই রিপোতেই push** করো।

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
   `Git: Clone` → URL: `https://github.com/mraselpubg-crypto/quran-studio-pro.git`  
   অথবা: `git clone https://github.com/mraselpubg-crypto/quran-studio-pro.git`

2. **Sign in:** GitHub Extension দিয়ে লগইন করো (PAT চ্যাটে বা ফাইলে লিখবে না)।

3. **প্রতি সেশন:** Source Control → **Pull** (`git pull origin main`)

4. **কাজ শেষে:** Source Control → stage → commit message → **Push** (`git push origin main`)

5. **Remote URL** শুধু HTTPS, token ছাড়া:  
   `https://github.com/mraselpubg-crypto/quran-studio-pro.git`

⚠️ **কখনো PAT/token** `CONTINUE_PROMPT.txt`, কোড, বা commit-এ রাখবে না।  
চ্যাটে token পাঠালে GitHub-এ **তৎক্ষণাৎ Revoke** করো।

---

## কোন ফাইল কখন পড়বে

| ক্রম | ফাইল | বিবরণ |
|------|------|--------|
| 0 | **AGENT_README.md** | এই ফাইল — এন্ট্রি পয়েন্ট |
| 1 | **WORKING_AGENT_PROMPT.txt** | দ্রুত শুরু / copy-paste |
| 2 | **CONTINUE_PROMPT.txt** | মাস্টার: Plan, tasks, rules, git |
| 3 | **PLAN17_DESIGN.md** | Plan 17 design (architecture) |
| 4 | AGENT_PROMPT.md | Legacy v2 — উপেক্ষা করো |

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
git commit -m "feat(Plan17): active page context for scoped reset and navigation"
git push origin main
```

তারপর **`CONTINUE_PROMPT.txt`** আপডেট (Plan ✅ + পরের Plan) → আবার commit + push।

**ক্রম:** live → check → code → verify → commit → push

---

## বর্তমান স্ট্যাটাস

| Plan | স্ট্যাটাস |
|------|-----------|
| Plan 14 | ✅ Scope reset + linking + history labels |
| Plan 16 | ✅ Area-Text auto reflow |
| **Plan 17** | ⬜ **এখন implement** — Active Page Context |
| Plan 18 | Stub — `CONTINUE_PROMPT.txt` |

বিস্তারিত টাস্ক: **`CONTINUE_PROMPT.txt`** → section "Plan 17"

---

## এজেন্টকে দেওয়ার এক-ব্লক প্রম্পট

```
Repo: https://github.com/mraselpubg-crypto/quran-studio-pro.git (branch main)
git pull origin main

রিপোর ফাইল পড়ো (ক্রমে):
AGENT_README.md → WORKING_AGENT_PROMPT.txt → CONTINUE_PROMPT.txt → PLAN17_DESIGN.md

Plan 17 implement করো। Plan 16 আগে থেকেই main-এ আছে।
npx tsc --noEmit && npm run build && node scripts/verify-editor.mjs
git add -A && git commit && git push origin main
CONTINUE_PROMPT.txt আপডেট (Plan 17 ✅) → আবার push।

PAT/token ফাইলে বা চ্যাটে দেবে না। GitHub Extension / Credential Manager ব্যবহার করো।
```

---

*Handoff files live in repo root — always pull before starting.*
