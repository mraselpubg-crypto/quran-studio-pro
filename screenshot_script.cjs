const { chromium } = require('playwright');
const path = require('path');
const ARTIFACTS = 'C:\\Users\\Rasel\\.gemini\\antigravity\\brain\\05c53cdb-9198-439b-bff8-e33063b499ee';

async function verifyUI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8080');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(ARTIFACTS, 'v_home.png') });

  // Click Editor button
  await page.click('text=এডিটর');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACTS, 'v_editor_loaded.png') });

  // Click on a Quran row in the canvas (first actual ayah row area)
  await page.mouse.click(600, 440);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACTS, 'v_row_selected.png') });

  // Scroll properties panel to see linking panel
  const propPanel = await page.$('.overflow-y-auto');
  if (propPanel) {
    await propPanel.evaluate(el => el.scrollTop += 400);
    await page.waitForTimeout(500);
  } else {
    await page.evaluate(() => { document.querySelector('[class*="overflow-y"]')?.scrollBy(0, 400); });
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(ARTIFACTS, 'v_linking_panel.png') });

  // Turn on Arabic linking switch
  const switches = await page.$$('[role="switch"]');
  if (switches.length > 0) {
    await switches[0].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS, 'v_arabic_linked.png') });
  }

  console.log('\n=== CONSOLE ERRORS ===');
  if (errors.length === 0) {
    console.log('✅ NO ERRORS FOUND!');
  } else {
    errors.forEach(e => console.log('❌', e));
  }

  await browser.close();
  console.log('Done.');
}

verifyUI().catch(console.error);
