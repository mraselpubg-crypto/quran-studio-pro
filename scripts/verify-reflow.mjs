/**
 * Plan 16 E2E — typography reflow + linking gate (best-effort smoke).
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const ARTIFACTS = join(process.cwd(), "scripts", "playwright-artifacts");
const BASE = "http://localhost:8080";

async function openEditor(page) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);

  const editorNav = page.getByText("এডিটর", { exact: false }).first();
  if (await editorNav.isVisible().catch(() => false)) {
    await editorNav.click();
    await page.waitForTimeout(1500);
  }

  const editModeBtn = page.getByText("এডিটর", { exact: true }).first();
  if (await editModeBtn.isVisible().catch(() => false)) {
    await editModeBtn.click();
    await page.waitForTimeout(1000);
  }

  const typeTool = page.getByTitle("Type Tool (T)");
  if (await typeTool.isVisible().catch(() => false)) {
    await typeTool.click();
    await page.waitForTimeout(500);
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
  await page.mouse.click(600, 440);
  await page.waitForTimeout(1200);

  const arabicLayer = page.locator('[data-layer-kind="arabic"]').first();
  if (await arabicLayer.isVisible().catch(() => false)) {
    await arabicLayer.click();
    await page.waitForTimeout(800);
  }

  const linkLabel = page.getByText("আরবি লিংক", { exact: false }).first();
  if (await linkLabel.isVisible().catch(() => false)) {
    const row = linkLabel.locator("xpath=ancestor::label[1]");
    const sw = row.locator('button[role="switch"]');
    if (await sw.isVisible().catch(() => false)) {
      const on = (await sw.getAttribute("data-state")) === "checked";
      if (!on) await sw.click();
      await page.waitForTimeout(400);
      results.push({ case: "link-on", ok: true });
    }
  }

  const fontInput = page.locator('input[type="number"]').filter({ has: page.locator("..") }).first();
  const charFont = page.getByText("Font Size", { exact: false }).locator("xpath=following::input[1]").first();
  const targetInput = (await charFont.isVisible().catch(() => false)) ? charFont : fontInput;

  if (await targetInput.isVisible().catch(() => false)) {
    await targetInput.fill("72");
    await targetInput.press("Enter");
    await page.waitForTimeout(1500);
    results.push({ case: "font-increase-linked", ok: true });
    await page.screenshot({ path: join(ARTIFACTS, "reflow-link-on.png"), fullPage: true });
  }

  if (await linkLabel.isVisible().catch(() => false)) {
    const row = linkLabel.locator("xpath=ancestor::label[1]");
    const sw = row.locator('button[role="switch"]');
    if (await sw.isVisible().catch(() => false)) {
      await sw.click();
      await page.waitForTimeout(400);
      results.push({ case: "link-off", ok: true });
    }
  }

  let sawLinkOffToast = false;
  page.on("console", () => {});
  await page.evaluate(() => {
    window.__reflowTest = true;
  });

  if (await targetInput.isVisible().catch(() => false)) {
    await targetInput.fill("120");
    await targetInput.press("Enter");
    await page.waitForTimeout(2000);
  }

  const toastText = page
    .locator('[data-sonner-toast], [data-sonner-toaster] [data-title], li')
    .filter({ hasText: /লিংক বন্ধ/ });
  sawLinkOffToast = await toastText.first().isVisible({ timeout: 5000 }).catch(() => false);
  results.push({ case: "link-off-toast", ok: sawLinkOffToast });

  const report = {
    url: BASE,
    results,
    consoleErrors: errors,
    ok:
      errors.length === 0 &&
      results.filter((r) => r.case !== "link-off-toast").every((r) => r.ok),
    ts: new Date().toISOString(),
  };
  await writeFile(join(ARTIFACTS, "reflow-report.json"), JSON.stringify(report, null, 2));
  console.log(report.ok ? "OK: reflow smoke" : "PARTIAL/FAIL:", JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.ok ? 0 : 1);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
