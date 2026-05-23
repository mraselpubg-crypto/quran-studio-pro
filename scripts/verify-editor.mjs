import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const ARTIFACTS = join(process.cwd(), "scripts", "playwright-artifacts");
const BASE = "http://localhost:8080";

async function verify() {
  await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(ARTIFACTS, "01-home.png"), fullPage: true });

  const editorBtn = page.getByText("এডিটর", { exact: false }).first();
  if (await editorBtn.isVisible().catch(() => false)) {
    await editorBtn.click();
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: join(ARTIFACTS, "02-editor.png"), fullPage: true });

  await page.mouse.click(600, 440);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(ARTIFACTS, "03-row-selected.png"), fullPage: true });

  const report = {
    url: BASE,
    consoleErrors: errors,
    ok: errors.length === 0,
    ts: new Date().toISOString(),
  };
  await writeFile(join(ARTIFACTS, "report.json"), JSON.stringify(report, null, 2));
  console.log(report.ok ? "OK: no console errors" : "FAIL:", errors);
  await browser.close();
  process.exit(report.ok ? 0 : 1);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
