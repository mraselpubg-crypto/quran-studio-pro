# Plan 21 — InDesign-like Layer Editing & Precise Alignment

## Context
ব্যবহারকারী চাচ্ছেন এডিটরটি সম্পূর্ণ Adobe InDesign-এর মতো প্রফেশনাল টেক্সট এডিটিং এবং এলাইনমেন্ট এক্সপেরিয়েন্স প্রদান করুক। প্রতিটি লাইনের প্রতিটি লেয়ার (আরবি, বাংলা, টপ সিম্বল) আলাদাভাবে সিলেক্ট, এডিট (টেক্সট যুক্ত/মুছে ফেলা), এবং কাস্টমাইজ করা যাবে। এই পরিবর্তনগুলো যেন রিস্ট/ডিফল্ট অবস্থার এলাইনমেন্টের সাপেক্ষে আনুপাতিকভাবে কাজ করে এবং সিলেকশন প্রভাব (Scope) অনুযায়ী ঠিকভাবে অ্যাপ্লাই হয়।

## Goals & Requirements

### 1. InDesign-like Universal Editing
- **Selectability:** ক্যানভাসের প্রতিটি লাইনের আরবি, বাংলা এবং টপ সিম্বল লেয়ার সম্পূর্ণ আলাদাভাবে সিলেক্ট করা যাবে।
- **Text Manipulation:** ইন-ডিজাইনের মতো নির্দিষ্ট লেয়ারে কার্সার রেখে টেক্সট Add বা Delete করা যাবে।
- **Typography Adjustments:** প্রতিটি লেয়ারের নির্দিষ্ট ফন্ট সাইজ, লিডিং, ট্র্যাকিং, বেসলাইন শিফট ইন-ডিজাইনের মতো নিখুঁতভাবে কাজ করবে।

### 2. Strict Scope Awareness (প্রভাব অনুযায়ী পরিবর্তন)
- **Scope Application:** যেকোনো টেক্সট এডিট বা টাইপোগ্রাফি পরিবর্তন (যেমন- লাইন সেটিং কমানো বা বাড়ানো) বর্তমান অ্যাক্টিভ সিলেকশন স্কোপ (সাধারণ, পেজ, সূরা, সম্পূর্ণ কুরআন) অনুযায়ী অ্যাপ্লাই হতে হবে।
- স্কোপ অনুযায়ী পরিবর্তনগুলো তাৎক্ষণিকভাবে (instant responsive rendering) ক্যানভাসে আপডেট হবে।

### 3. Dynamic Alignment relative to Reset State
- **Baseline Alignment:** "রিসেট অবস্থায়" (Reset State) টেক্সটগুলো যেভাবে অ্যালাইন থাকে, কোনো লাইনের সেটিং (ফন্ট সাইজ/স্কেল) কমালে বা বাড়ালে সেটি ওই ডিফল্ট এলাইনমেন্টের লজিক মেইনটেইন করে আনুপাতিকভাবে (proportionally) আপডেট/অ্যালাইন হবে।
- **Reflow Consistency:** টেক্সট অ্যাড বা ডিলিট করলে প্যারাগ্রাফ রিফ্লো (Plan 20) এমনভাবে কাজ করবে যেন তা ইন-ডিজাইনের টেক্সট বক্স লিংকিংয়ের মতো ন্যাচারাল হয়।

## Proposed Architecture & Tasks

### Task 1: Layer Independence & Selection
**File:** `src/components/studio/FabricLines.tsx`
- নিশ্চিত করতে হবে `TopSymbolLayer`, `Arabic Layer`, এবং `Bangla Layer` যেন একে অপরের সাথে overlap না করে ক্লিক ইভেন্ট ব্লক না করে।
- `contentEditable` অথবা `InlineTextEditor` যেন প্রতিটি লেয়ারের জন্য স্বাধীনভাবে ইনিশিয়ালাইজ হয়।

### Task 2: Typography & Alignment Scaling
**File:** `src/components/studio/FabricLines.tsx` & `src/lib/typographyReflow.ts`
- যখন Local Override-এ কোনো স্কেল বা ফন্ট সাইজ পরিবর্তন হয়, তখন `transform-origin` এবং `line-height` এমনভাবে ক্যালকুলেট করতে হবে যেন সেটি Reset State-এর বেসলাইন ধরে রাখে।
- InDesign-এর মতো justify alignment এবং last-line alignment ঠিক করতে `textAlignLast` প্রপার্টিগুলো আরও নিখুঁত করতে হবে।

### Task 3: Scope-Aware Apply Engine Check
**File:** `src/state/overridesStore.ts` & `src/lib/reflowScope.ts`
- নিশ্চিত করতে হবে যে `patchScoped` ফাংশনটি টপ সিম্বল লেয়ারের জন্যও স্কোপ ঠিকমতো ক্যালকুলেট করছে।
- টেক্সট ডিলিট বা অ্যাড করার সময় স্কোপ ইমপ্যাক্ট অনুযায়ী ক্যাসকেড বা ওভারফ্লো প্ল্যানিং ঠিকমতো ট্রিগার হচ্ছে কিনা তা ভেরিফাই করা।

## Verification Plan
1. **Edit Test:** যেকোনো পেজের একটি লাইনে আরবি, বাংলা এবং টপ সিম্বল আলাদাভাবে সিলেক্ট করে টেক্সট ডিলিট/অ্যাড করে দেখতে হবে ইন-ডিজাইনের মতো কাজ করছে কিনা।
2. **Alignment Test:** একটি লাইনের ফন্ট সাইজ অনেক বড় বা ছোট করে দেখতে হবে অন্য লেয়ারের সাথে এর ডিফল্ট এলাইনমেন্ট লজিক ঠিক আছে কিনা।
3. **Scope Test:** স্কোপ 'পেজ' রেখে একটি লেয়ারের লিডিং (Leading) পরিবর্তন করে দেখতে হবে ওই পেজের সব লাইনের ওই লেয়ারে পরিবর্তনটি তাৎক্ষণিক অ্যাপ্লাই হচ্ছে কিনা।

## Note for Working Agent
- **No Git Pushes Needed:** This workspace is entirely local. Do not run any `git commit` or `git push` commands. Just implement the code and verify locally.
- **Performance:** Maintain the strict rule of instant local rendering without loading screens for small/scoped edits.
