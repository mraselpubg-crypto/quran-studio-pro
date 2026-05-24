import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const ARTIFACTS = join(process.cwd(), "scripts", "playwright-artifacts");
const BASE = "http://localhost:8080";

async function openEditor(page) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);

  const editorNav = page.getByText("এডিটর", { exact: false }).first();
  if (await editorNav.isVisible().catch(() => false)) {
    await editorNav.click();
    await page.waitForTimeout(1500);
  }
}

async function verify() {
  await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const results = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await openEditor(page);
  await page.screenshot({ path: join(ARTIFACTS, "sidebar-01-editor.png"), fullPage: true });

  const search = page.getByPlaceholder("সূরা খুঁজুন (Arabic/Bengali/English)…");
  const searchVisible = await search.isVisible().catch(() => false);
  results.push({ case: "search-visible", ok: searchVisible });
  if (!searchVisible) throw new Error("Sidebar search input not visible");

  await search.fill("Al-Baqarah");
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(ARTIFACTS, "sidebar-02-search.png"), fullPage: true });

  const surah2Header = page.locator("button", { hasText: "البقرة" }).first();
  const surah2Visible = await surah2Header.isVisible().catch(() => false);
  results.push({ case: "surah2-visible", ok: surah2Visible });

  const surah1HeaderVisible = await page.locator("button", { hasText: "الفاتحة" }).first().isVisible().catch(() => false);
  results.push({ case: "surah1-filtered-out", ok: !surah1HeaderVisible });

  if (!surah2Visible) throw new Error("Surah 2 header not visible after English search");
  await surah2Header.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(ARTIFACTS, "sidebar-03-clicked-surah2.png"), fullPage: true });

  const pageCounterText = ((await page.locator("text=বর্তমান পেজ").locator("..") .textContent().catch(() => "")) || "").replace(/\s+/g, " ");
  const navigatedToPage2 = /2\s*\/|২\s*\//.test(pageCounterText) || /আল-বাকারা/.test(pageCounterText);
  results.push({ case: "navigated-after-header-click", ok: navigatedToPage2 });

  const report = {
    url: BASE,
    results,
    pageCounterText,
    consoleErrors: errors,
    ok: errors.length === 0 && results.every((r) => r.ok),
    ts: new Date().toISOString(),
  };

  await writeFile(join(ARTIFACTS, "sidebar-report.json"), JSON.stringify(report, null, 2));
  console.log(report.ok ? "OK: sidebar smoke" : "FAIL:", JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.ok ? 0 : 1);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
