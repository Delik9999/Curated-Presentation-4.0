import { test, expect } from '@playwright/test';

test.describe('Selection Tab Design Review', () => {
  test('capture selection tab screenshots for design analysis', async ({ page }) => {
    // Navigate directly to customer page with selection tab active
    await page.goto('http://localhost:3000/customers/starlight-lighting?tab=selection');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for page to fully render

    // Log what's on the page for debugging
    const bodyText = await page.textContent('body');
    console.log('Page loaded, checking content...');

    // Wait for main content area to render (more generic selector)
    await page.waitForSelector('main', { timeout: 10000 });
    await page.waitForTimeout(1500); // Give time for any animations

    // Take full page screenshot (light mode)
    await page.screenshot({
      path: 'test-results/selection-tab-full-light.png',
      fullPage: true,
    });

    // Take viewport screenshot
    await page.screenshot({
      path: 'test-results/selection-tab-viewport-light.png',
      fullPage: false,
    });

    // Scroll to bottom to see totals
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/selection-tab-bottom-light.png',
      fullPage: false,
    });

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Test dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/selection-tab-full-dark.png',
      fullPage: true,
    });

    await page.screenshot({
      path: 'test-results/selection-tab-viewport-dark.png',
      fullPage: false,
    });

    console.log('Screenshots captured successfully');
  });
});
