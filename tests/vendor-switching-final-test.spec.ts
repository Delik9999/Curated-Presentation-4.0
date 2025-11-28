import { test, expect } from '@playwright/test';

test('verify collections show correctly when switching vendors (final test)', async ({ page }) => {
  // Navigate to customer page
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta');

  // Login
  await page.fill('input[name="username"]', 'accent');
  await page.fill('input[name="password"]', 'test123');
  await page.click('button[type="submit"]');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  console.log('\n=== TEST 1: Lib & Co Collections ===');
  // Navigate to collections tab with Lib & Co
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta?tab=collections&vendor=lib-and-co');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check that Lib & Co collections are visible
  const libCoText = await page.textContent('body');
  const hasAdelfia = libCoText?.includes('Adelfia');
  const hasAbbott = libCoText?.includes('Abbott');

  console.log('Has Adelfia:', hasAdelfia);
  console.log('Has Abbott:', hasAbbott);

  expect(hasAdelfia, 'Adelfia should be visible in Lib & Co').toBe(true);
  expect(hasAbbott, 'Abbott should NOT be visible in Lib & Co').toBe(false);

  console.log('\n=== TEST 2: Savoy House Collections ===');
  // Switch to Savoy House
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta?tab=collections&vendor=savoy-house');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check that Savoy House collections are visible
  const savoyText = await page.textContent('body');
  const savoyHasAbbott = savoyText?.includes('Abbott');
  const savoyHasAdelfia = savoyText?.includes('Adelfia');

  console.log('Has Abbott:', savoyHasAbbott);
  console.log('Has Adelfia:', savoyHasAdelfia);

  expect(savoyHasAbbott, 'Abbott should be visible in Savoy House').toBe(true);
  expect(savoyHasAdelfia, 'Adelfia should NOT be visible in Savoy House').toBe(false);

  console.log('\n=== TEST 3: Switch back to Lib & Co ===');
  // Switch back to Lib & Co
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta?tab=collections&vendor=lib-and-co');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check that Lib & Co collections are still correct
  const libCoText2 = await page.textContent('body');
  const hasAdelfia2 = libCoText2?.includes('Adelfia');
  const hasAbbott2 = libCoText2?.includes('Abbott');

  console.log('Has Adelfia:', hasAdelfia2);
  console.log('Has Abbott:', hasAbbott2);

  expect(hasAdelfia2, 'Adelfia should still be visible after switching back').toBe(true);
  expect(hasAbbott2, 'Abbott should NOT be visible after switching back').toBe(false);

  console.log('\n✅ All tests passed!');
});
