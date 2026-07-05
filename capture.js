const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Define artifact paths
  const mobilePath = path.resolve('C:/Users/USER/.gemini/antigravity/brain/8ad9938e-d4ae-4edf-b0d2-33096001da5d/mobile_screenshot.png');
  const tabletPath = path.resolve('C:/Users/USER/.gemini/antigravity/brain/8ad9938e-d4ae-4edf-b0d2-33096001da5d/tablet_screenshot.png');

  // Mobile Viewport (iPhone 12/13/14 Pro width)
  console.log('Capturing mobile layout at 375x812...');
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log('Mobile screenshot saved to:', mobilePath);

  // Tablet Viewport (iPad width)
  console.log('Capturing tablet layout at 768x1024...');
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: tabletPath, fullPage: false });
  console.log('Tablet screenshot saved to:', tabletPath);

  await browser.close();
  console.log('Browser closed successfully!');
})();
