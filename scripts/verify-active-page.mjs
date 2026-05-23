import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const ARTIFACTS = join(process.cwd(), "scripts", "playwright-artifacts");
const BASE = "http://localhost:8080";
const STORAGE_KEY = "studio-overrides-v4";

const seedState = {
  state: {
    global: {
      arabicFontPx: 50,
      banglaFontPx: 18,
      arabicYOffset: 0,
      banglaYOffset: 0,
      symbolYOffset: 0,
    },
    local: {
      "layer:vpage-1:0:arabic": { fontPx: 61 },
      "layer:vpage-2:0:arabic": { fontPx: 73 },
    },
  },
  version: 0,
};

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
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const results = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: STORAGE_KEY, payload: seedState },
  );

  await openEditor(page);
  await page.screenshot({ path: join(ARTIFACTS, "active-page-01-editor.png"), fullPage: true });

  const selectionActive = await page.getByText("Deselect", { exact: true }).isVisible().catch(() => false);
  if (selectionActive) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  const deselectVisible = await page.getByText("Deselect", { exact: true }).isVisible().catch(() => false);
  results.push({ case: "no-selection", ok: !deselectVisible });

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(ARTIFACTS, "active-page-02-page2.png"), fullPage: true });

  const pageCounter = page.locator("text=পেজ").last();
  const pageCounterBlock = page.locator("div.pointer-events-auto.flex.items-center.gap-2.rounded-full").last();
  const counterText = ((await pageCounterBlock.textContent().catch(() => "")) || "").replace(/\s+/g, " ");
  results.push({ case: "page-2-visible", ok: counterText.includes("2") });

  await page.keyboard.press("Alt+2");
  await page.waitForTimeout(700);

  await page.getByRole("button", { name: "সব রিসেট করুন" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "হ্যাঁ, রিসেট করুন" }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(ARTIFACTS, "active-page-03-reset.png"), fullPage: true });

  const stored = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);

  const local = stored?.state?.local ?? {};
  const page1StillExists = Object.prototype.hasOwnProperty.call(local, "layer:vpage-1:0:arabic");
  const page2Gone = !Object.prototype.hasOwnProperty.call(local, "layer:vpage-2:0:arabic");
  results.push({ case: "page1-override-preserved", ok: page1StillExists });
  results.push({ case: "page2-override-cleared", ok: page2Gone });

  const report = {
    url: BASE,
    results,
    counterText,
    remainingLocalKeys: Object.keys(local).sort(),
    consoleErrors: errors,
    ok: errors.length === 0 && results.every((r) => r.ok),
    ts: new Date().toISOString(),
  };

  await writeFile(join(ARTIFACTS, "active-page-report.json"), JSON.stringify(report, null, 2));
  console.log(report.ok ? "OK: active-page smoke" : "FAIL:", JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.ok ? 0 : 1);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
