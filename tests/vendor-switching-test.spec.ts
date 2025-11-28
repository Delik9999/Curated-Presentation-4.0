import { test, expect } from '@playwright/test';

test('verify collections show correctly when switching vendors', async ({ page }) => {
  // Navigate to customer page
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta');

  // Login (try with "accent" customer and "test123" password)
  await page.fill('input[name="username"]', 'accent');
  await page.fill('input[name="password"]', 'test123');
  await page.click('button[type="submit"]');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Navigate to collections tab with Lib & Co
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta?tab=collections&vendor=lib-and-co');
  await page.waitForLoadState('networkidle');

  // Wait a bit for React to render
  await page.waitForTimeout(2000);

  // Check that Lib & Co collections are visible
  console.log('\n=== Lib & Co Collections ===');
  const libCoText = await page.textContent('body');
  const hasAdelfia = libCoText?.includes('Adelfia');
  const hasAlcamo = libCoText?.includes('Alcamo');
  const hasAbbott = libCoText?.includes('Abbott');

  console.log('Has Adelfia:', hasAdelfia);
  console.log('Has Alcamo:', hasAlcamo);
  console.log('Has Abbott:', hasAbbott);

  // Switch to Savoy House
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta?tab=collections&vendor=savoy-house');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check that Savoy House collections are visible
  console.log('\n=== Savoy House Collections ===');
  const savoyText = await page.textContent('body');
  const savoyHasAbbott = savoyText?.includes('Abbott');
  const savoyHasAdelfia = savoyText?.includes('Adelfia');
  const savoyHasAlcamo = savoyText?.includes('Alcamo');

  console.log('Has Abbott:', savoyHasAbbott);
  console.log('Has Adelfia:', savoyHasAdelfia);
  console.log('Has Alcamo:', savoyHasAlcamo);

  // Switch back to Lib & Co
  await page.goto('http://localhost:3000/customers/accent-lighting-inc-alberta?tab=collections&vendor=lib-and-co');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check that Lib & Co collections are still correct
  console.log('\n=== Lib & Co Collections (after switching back) ===');
  const libCoText2 = await page.textContent('body');
  const hasAdelfia2 = libCoText2?.includes('Adelfia');
  const hasAlcamo2 = libCoText2?.includes('Alcamo');
  const hasAbbott2 = libCoText2?.includes('Abbott');

  console.log('Has Adelfia:', hasAdelfia2);
  console.log('Has Alcamo:', hasAlcamo2);
  console.log('Has Abbott:', hasAbbott2);

  // Assertions
  expect(hasAdelfia).toBe(true);
  expect(hasAlcamo).toBe(true);
  expect(hasAbbott).toBe(false); // Should NOT have Abbott in Lib & Co

  expect(savoyHasAbbott).toBe(true);
  expect(savoyHasAdelfia).toBe(false); // Should NOT have Adelfia in Savoy
  expect(savoyHasAlcamo).toBe(false); // Should NOT have Alcamo in Savoy

  expect(hasAdelfia2).toBe(true);
  expect(hasAlcamo2).toBe(true);
  expect(hasAbbott2).toBe(false); // Should NOT have Abbott when switching back

  console.log('\n✅ All checks passed!');
});
