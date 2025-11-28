import { test, expect } from '@playwright/test';

test('debug savoy house collections tab', async ({ page }) => {
  // Listen to console logs from the browser
  page.on('console', msg => {
    console.log('Browser log:', msg.text());
  });

  // First, log in as a customer
  await page.goto('http://localhost:3000/auth/customer/carrington-lighting-dba-can-kor');

  // Fill in login form - password is "password" for all test accounts (hash: $2b$10$hdxGrHZufyKwsreFES9X8uYhpd2U.8E1jQ5OhK..qQWzLFDcPZrVK)
  await page.fill('input[name="username"]', 'carrington');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL('**/customers/carrington-lighting-dba-can-kor**', { timeout: 5000 });

  // Navigate to the Savoy House collections tab
  await page.goto('http://localhost:3000/customers/carrington-lighting-dba-can-kor?tab=collections&vendor=savoy-house');

  // Wait a bit for the page to load
  await page.waitForTimeout(3000);

  // Take a screenshot
  await page.screenshot({ path: 'savoy-collections-debug.png', fullPage: true });

  // Check if there are any collections displayed
  const collectionsCount = await page.locator('[data-collection]').count();
  console.log('Collections found on page:', collectionsCount);

  // Get page text content
  const pageText = await page.textContent('body');
  console.log('Page contains "Abbott":', pageText?.includes('Abbott'));
  console.log('Page contains "No collections":', pageText?.includes('No collections') || pageText?.includes('no collections'));
});
