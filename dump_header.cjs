const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:8080');
  await p.waitForTimeout(3000);
  await p.click('text=এডিটর');
  await p.waitForTimeout(1000);
  const html = await p.evaluate(() => document.querySelector('header')?.outerHTML || 'No header');
  console.log(html);
  await b.close();
})();
