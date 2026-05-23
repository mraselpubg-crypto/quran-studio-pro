const { chromium } = require('playwright');
const path = require('path');

async function checkUI() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:8080');
  
  // Wait for cold start lazy loading
  await page.waitForTimeout(3000);
  
  // Go to Editor Tab (usually wait for it to be visible and click)
  console.log('Going to editor...');
  await page.click('text=এডিটর');
  await page.waitForTimeout(1000);
  
  // Take screenshot of TopBar to see Save / Auto Save option
  console.log('Taking screenshot of top bar...');
  await page.screenshot({ path: path.join('C:\\Users\\Rasel\\.gemini\\antigravity\\brain\\05c53cdb-9198-439b-bff8-e33063b499ee', 'topbar.png') });
  
  // Click on a row to reveal PropertiesPanel
  console.log('Clicking a row to show properties...');
  // Usually rows have a specific class or we can click roughly where the text is
  await page.mouse.click(600, 400);
  await page.waitForTimeout(1000);
  
  // Take screenshot of properties panel (sub layer options)
  console.log('Taking screenshot of properties...');
  await page.screenshot({ path: path.join('C:\\Users\\Rasel\\.gemini\\antigravity\\brain\\05c53cdb-9198-439b-bff8-e33063b499ee', 'properties.png') });
  
  // Scroll down in properties panel if needed, or just click "সব রিসেট করুন"
  console.log('Clicking reset all...');
  try {
    await page.click('text=সব রিসেট করুন', { timeout: 3000 });
    await page.waitForTimeout(500);
    // Take screenshot of the confirmation dialog
    console.log('Taking screenshot of reset modal...');
    await page.screenshot({ path: path.join('C:\\Users\\Rasel\\.gemini\\antigravity\\brain\\05c53cdb-9198-439b-bff8-e33063b499ee', 'reset_modal.png') });
  } catch (e) {
    console.error('Could not find Reset button or dialog', e);
  }

  await browser.close();
  console.log('Done.');
}

checkUI().catch(console.error);
