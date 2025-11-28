import { test, expect } from '@playwright/test';

test.describe('Rep Portal Changes Verification', () => {
  test('Dallas tab shows workspace directly without entry screen', async ({ page }) => {
    // Navigate to rep portal
    await page.goto('/rep');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial page
    await page.screenshot({ path: 'tests/screenshots/rep-portal-initial.png', fullPage: true });

    // Click on Dallas tab
    await page.click('[data-state="inactive"][value="dallas"]');

    // Wait for Dallas workspace to load
    await page.waitForTimeout(2000);

    // Take screenshot of Dallas tab
    await page.screenshot({ path: 'tests/screenshots/dallas-tab.png', fullPage: true });

    // Verify that the Dallas workspace is visible (not the entry screen)
    // The entry screen would have "Dallas Market Tools" heading and "Open Dallas Authoring" button
    // The workspace should have the customer selector and year selector
    const hasEntryButton = await page.locator('text="Open Dallas Authoring"').count();
    expect(hasEntryButton).toBe(0); // Should not have entry button

    // Should have Dallas workspace elements
    await expect(page.locator('text="Dallas Market Orders"')).toBeVisible();
  });

  test('View Site button works on customer cards', async ({ page }) => {
    // Navigate to rep portal
    await page.goto('/rep');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait for customers to load
    await page.waitForTimeout(1000);

    // Take screenshot of customers tab
    await page.screenshot({ path: 'tests/screenshots/customers-tab.png', fullPage: true });

    // Find and click the first "View Site" button
    const viewSiteButton = page.locator('text="View Site"').first();
    await expect(viewSiteButton).toBeVisible();

    // Click the View Site button
    await viewSiteButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of customer site
    await page.screenshot({ path: 'tests/screenshots/customer-site.png', fullPage: true });

    // Verify we're on a customer page (URL should be /customers/...)
    expect(page.url()).toContain('/customers/');
  });
});
