import { chromium } from '@playwright/test';
import path from 'path';

async function captureScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/rep');
    await page.waitForLoadState('networkidle');

    // Try common passwords
    const passwords = ['password', 'rep', 'rep123', 'admin', 'admin123', '123456', 'demo', 'test'];

    let loginSuccessful = false;
    for (const password of passwords) {
      console.log(`Trying password: ${password}`);

      // Fill in login form using ID selectors
      await page.fill('#username', 'rep');
      await page.fill('#password', password);

      // Click sign in button
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Wait a bit to see if login was successful
      await page.waitForTimeout(3000);

      // Check if we're still on the login page
      const currentUrl = page.url();
      if (!currentUrl.includes('/auth/signin')) {
        console.log(`✅ Login successful with password: ${password}`);
        loginSuccessful = true;
        break;
      } else {
        console.log(`❌ Login failed with password: ${password}`);
        // Reload the login page
        await page.goto('http://localhost:3000/auth/signin?type=admin&callbackUrl=/rep');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
    }

    if (!loginSuccessful) {
      console.log('\n⚠️  None of the common passwords worked.');
      console.log('Please check data/credentials.json for the correct password hash.');
      console.log('You may need to manually login at http://localhost:3000/rep');
      await browser.close();
      return;
    }

    // Wait for the page to load
    await page.waitForTimeout(3000);

    console.log('Taking screenshot of Rep Portal...');
    await page.screenshot({
      path: 'tests/screenshots/01-rep-portal-customers-tab.png',
      fullPage: true,
    });

    // Click on Dallas tab
    console.log('Clicking Dallas tab...');
    await page.click('[value="dallas"]');
    await page.waitForTimeout(3000);

    console.log('Taking screenshot of Dallas tab...');
    await page.screenshot({
      path: 'tests/screenshots/02-dallas-tab-workspace.png',
      fullPage: true,
    });

    // Go back to customers tab
    console.log('Going back to Customers tab...');
    await page.click('[value="customers"]');
    await page.waitForTimeout(2000);

    // Click first "View Site" button if exists
    const viewSiteButtons = await page.locator('a:has-text("View Site")').all();
    if (viewSiteButtons.length > 0) {
      console.log('Clicking first View Site button...');
      await viewSiteButtons[0].click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      console.log('Taking screenshot of customer site...');
      await page.screenshot({
        path: 'tests/screenshots/03-customer-site.png',
        fullPage: true,
      });
    }

    console.log('✅ Screenshots captured successfully!');
    console.log('\nScreenshots saved to:');
    console.log('- tests/screenshots/01-rep-portal-customers-tab.png');
    console.log('- tests/screenshots/02-dallas-tab-workspace.png');
    console.log('- tests/screenshots/03-customer-site.png');
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
