import { test, expect } from '@playwright/test';

test('Promotion Progress - New Design Review', async ({ page }) => {
  // Navigate to customer selection page with promotion
  await page.goto('http://localhost:3000/customers/starlight-lighting?tab=selection', {
    waitUntil: 'networkidle',
  });

  // Wait for page to fully load
  await page.waitForTimeout(2000);

  // Take full page screenshot (light mode)
  await page.screenshot({
    path: 'tests/screenshots/promotion-progress-light.png',
    fullPage: true,
  });

  // Scroll to promotion card
  const promotionCard = page.locator('div').filter({ hasText: /Spring Forward Promotion|Active/ }).first();
  if (await promotionCard.isVisible()) {
    await promotionCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take close-up screenshot of promotion card
    await promotionCard.screenshot({
      path: 'tests/screenshots/promotion-card-detail-light.png',
    });
  }

  // Toggle dark mode
  const themeToggle = page.locator('[aria-label="Toggle theme"]').or(
    page.locator('button').filter({ hasText: /theme|dark|light/i })
  );

  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Take full page screenshot (dark mode)
    await page.screenshot({
      path: 'tests/screenshots/promotion-progress-dark.png',
      fullPage: true,
    });

    // Take close-up of promotion card in dark mode
    if (await promotionCard.isVisible()) {
      await promotionCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      await promotionCard.screenshot({
        path: 'tests/screenshots/promotion-card-detail-dark.png',
      });
    }
  }

  // Verify key components are visible
  await expect(page.locator('text=/Active/')).toBeVisible();

  console.log('✅ Promotion progress design screenshots captured successfully');
});
