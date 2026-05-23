# 🤖 Agent Instructions — Quran Studio Pro

> **এই রিপোই এজেন্টের একমাত্র সোর্স।** চ্যাটে পুরনো প্রম্পট নয় — নিচের ফাইল পড়ে কাজ করো, শেষে এখানেই push করো।

## Repository

| | |
|---|---|
| **URL** | https://github.com/mraselpubg-crypto/quran-studio-pro.git |
| **Branch** | `main` |
| **Local path** | `c:\xampp\htdocs\q01\quran-studio-pro` |
| **Dev** | http://localhost:8080 → `npm run dev` |

⚠️ **কখনো GitHub PAT/token ফাইলে বা চ্যাটে commit করবে না।** Push এর জন্য Windows Credential Manager / `gh auth login` ব্যবহার করো।

---

## কোন ফাইল কখন পড়বে

| ক্রম | ফাইল | বিবরণ |
|------|------|--------|
| 1 | **WORKING_AGENT_PROMPT.txt** | দ্রুত শুরু |
| 2 | **CONTINUE_PROMPT.txt** | মাস্টার: Plan স্ট্যাটাস, টাস্ক, rules, git commands |
| 3 | **PLAN17_DESIGN.md** | Plan 17 আর্কিটেকচার (বর্তমান কাজ) |
| 4 | AGENT_PROMPT.md | শুধু legacy — উপেক্ষা করো |

---

## প্রতি সেশনে করণীয় (copy-paste)

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

তারপর `CONTINUE_PROMPT.txt` আপডেট (Plan ✅ + পরের Plan) → আবার `git commit` + `git push`.

---

## বর্তমান স্ট্যাটাস (2026-05-23)

| Plan | স্ট্যাটাস |
|------|-----------|
| Plan 14 | ✅ Done |
| Plan 16 | ✅ Done — Area-Text reflow |
| **Plan 17** | ⬜ **এখন করো** — Active Page Context |
| Plan 18 | Stub — CONTINUE_PROMPT.txt দেখো |

---

## এজেন্টকে দেওয়ার এক লাইন প্রম্পট

```
git pull origin main; রিপোর AGENT_README.md → WORKING_AGENT_PROMPT.txt → CONTINUE_PROMPT.txt পড়ে Plan 17 implement করো; verify; push origin main; CONTINUE_PROMPT আপডেট করে আবার push।
```

---

*Last handoff commit: see `git log -1` on main.*
