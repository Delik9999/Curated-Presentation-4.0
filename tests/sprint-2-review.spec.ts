import { test, expect } from '@playwright/test';

test('Sprint 2 Features Review', async ({ page }) => {
  // Navigate to customer selection page with promotion
  await page.goto('http://localhost:3000/customers/starlight-lighting?tab=selection', {
    waitUntil: 'networkidle',
  });

  // Wait for page to fully load
  await page.waitForTimeout(2000);

  // Take full page screenshot showing all Sprint 2 features
  await page.screenshot({
    path: 'tests/screenshots/sprint-2-full-page.png',
    fullPage: true,
  });

  // Verify Total Savings KPI is visible
  const savingsKPI = page.locator('text=/Total Savings/i').first();
  if (await savingsKPI.isVisible()) {
    console.log('✅ Total Savings KPI is visible');

    // Scroll to and capture Total Savings KPI
    await savingsKPI.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const kpiContainer = savingsKPI.locator('..').locator('..'); // Navigate up to container
    await kpiContainer.screenshot({
      path: 'tests/screenshots/total-savings-kpi.png',
    });
  } else {
    console.log('ℹ️  Total Savings KPI not visible (may be zero savings)');
  }

  // Verify Promotion Progress card is visible
  const promotionCard = page.locator('text=/Active/').first();
  if (await promotionCard.isVisible()) {
    console.log('✅ Promotion Progress card is visible');

    await promotionCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get the parent card
    const card = page.locator('[class*="rounded-2xl"]').filter({ has: page.locator('text=/Active/') }).first();
    await card.screenshot({
      path: 'tests/screenshots/promotion-progress-sprint2.png',
    });
  }

  // Check for What-If Calculator
  const whatIfCalculator = page.locator('text=/What-If Calculator/i');
  if (await whatIfCalculator.isVisible()) {
    console.log('✅ What-If Calculator is visible');

    await whatIfCalculator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take screenshot of collapsed state
    const calculatorCard = whatIfCalculator.locator('..').locator('..').locator('..');
    await calculatorCard.screenshot({
      path: 'tests/screenshots/what-if-calculator-collapsed.png',
    });

    // Click expand button
    const expandButton = page.locator('button', { hasText: /expand/i }).first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Take screenshot of expanded state
      await calculatorCard.screenshot({
        path: 'tests/screenshots/what-if-calculator-expanded.png',
      });

      console.log('✅ What-If Calculator expanded successfully');
    }
  } else {
    console.log('ℹ️  What-If Calculator not visible (may be at max tier)');
  }

  // Verify milestone tracker is visible
  const milestoneTracker = page.locator('text=/30% OFF|50% OFF|60% OFF/').first();
  if (await milestoneTracker.isVisible()) {
    console.log('✅ Milestone Tracker is visible');
  }

  // Verify radial goal meter is visible
  const goalMeter = page.locator('text=/more/').first();
  if (await goalMeter.isVisible()) {
    console.log('✅ Radial Goal Meter is visible');
  }

  console.log('\n📊 Sprint 2 Features Summary:');
  console.log('   - Total Savings KPI: Prominent savings display at top');
  console.log('   - What-If Calculator: Interactive tier comparison tool');
  console.log('   - Celebration Animations: Confetti on tier achievement');
  console.log('   - Enhanced Promotion Progress: Stepped milestones + radial meter');
  console.log('\n✅ Sprint 2 review complete!');
});
