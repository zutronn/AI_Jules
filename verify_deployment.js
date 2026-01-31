const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    // Wait for some data to load
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'deployment_screenshot.png' });
    console.log('Screenshot saved as deployment_screenshot.png');
  } catch (e) {
    console.error('Error during screenshot:', e);
  } finally {
    await browser.close();
  }
})();
