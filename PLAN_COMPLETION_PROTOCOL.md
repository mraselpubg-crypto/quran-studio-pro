# Plan Completion Protocol — অবশ্যই মানতে হবে

> **যেকোনো Agent (Cursor / Lovable / Fixer):** একটি Plan শেষ মানে শুধু কোড লেখা নয়।  
> **রিপোর হ্যান্ডঅফ ফাইল আপডেট + verify + push** — তারপরই Plan ✅।

---

## কখন Plan “done” বলা যাবে

নিচের **সব** শর্ত পূরণ হলে:

1. কোড implement + `npx tsc --noEmit` = 0  
2. `npm run build` = 0  
3. `npm run dev` চালু থাকলে `node scripts/verify-editor.mjs` (ও প্রযোজ্য হলে `verify-reflow.mjs`)  
4. `git push origin main` — feature commit  
5. **হ্যান্ডঅফ ফাইল আপডেট** (নিচের তালিকা) — **দ্বিতীয় commit + push**  
6. `CONTINUE_PROMPT.txt`-এ সম্পন্ন Plan ✅ + **পরের Plan** বিস্তারিত লেখা

---

## Plan শেষে আপডেট করতে হবে (চেকলিস্ট)

| # | ফাইল | কী করবে |
|---|------|----------|
| 1 | **CONTINUE_PROMPT.txt** | Plan N → ✅ COMPLETED; Plan N+1 → CURRENT; তারিখ; সংক্ষিপ্ত bullet কী করা হয়েছে |
| 2 | **AGENT_README.md** | স্ট্যাটাস টেবিল আপডেট (কোন Plan এখন implement) |
| 3 | **WORKING_AGENT_PROMPT.txt** | “Your job RIGHT NOW” = পরের Plan নম্বর |
| 4 | **PLAN(N)_AGENT_PROMPT.txt** | সম্পন্ন Plan-এর জন্য archive prompt (যেমন Plan16) — optional |
| 5 | **PLAN(N+1)_DESIGN.md** | পরের Plan design — যদি না থাকে তৈরি করো |
| 6 | **PLAN(N+1)_AGENT_PROMPT.txt** | পরের Fixer-এর copy-paste prompt — তৈরি করো |

**কখনো শুধু চ্যাটে “done” বলে থামবে না — রিপো ফাইলই পরবর্তী এজেন্টের মেমোরি।**

---

## CONTINUE_PROMPT.txt টেমপ্লেট (Plan শেষে কপি-এডিট)

```markdown
### Plan NN ✅ — [শিরোনাম] (commit HASH)
- bullet: কী ফাইল/ফিচার
- verify: tsc, build, verify-*.mjs

## 🎯 CURRENT PLAN — Plan NN+1: [শিরোনাম] (IMPLEMENT NEXT)
### Problem
...
### Tasks
1. ...
### Verification
...
### Commit message
feat(PlanNN+1): ...
```

---

## দ্বিতীয় commit (হ্যান্ডঅফ)

```powershell
git add CONTINUE_PROMPT.txt AGENT_README.md WORKING_AGENT_PROMPT.txt PLAN*.md PLAN_COMPLETION_PROTOCOL.md
git commit -m "docs: handoff after PlanNN — PlanNN+1 ready for next agent"
git push origin main
```

---

## পরবর্তী এজেন্ট কী পড়বে

```
git pull origin main
AGENT_README.md → CONTINUE_PROMPT.txt → PLAN(N+1)_DESIGN.md → WORKING_AGENT_PROMPT.txt
```

বর্তমান Plan শুধু **CONTINUE_PROMPT.txt**-এর “CURRENT PLAN” সেকশনে।

---

## বাগ / আংশিক কাজ

Plan অর্ধেক থাকলে ✅ লিখবে না। লিখবে:

```markdown
### Plan NN 🔄 IN PROGRESS
- done: ...
- remaining: ...
```

---

*এই প্রোটোকল বদলাবে না — শুধু নতুন Plan যোগ হবে।*
