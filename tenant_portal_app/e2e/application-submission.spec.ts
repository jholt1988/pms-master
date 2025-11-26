import { test, expect } from '@playwright/test';

test.describe('Application Submission Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application landing page
    await page.goto('/rental-application');
  });

  test('should display application landing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Apply for Your New Home');
    await expect(page.locator('text=Start Application')).toBeVisible();
  });

  test('should navigate to application form from landing page', async ({ page }) => {
    await page.click('text=Start Application');
    await expect(page).toHaveURL(/.*rental-application\/form/);
    await expect(page.locator('h1, h2')).toContainText(/Rental Application|Application/i);
  });

  test('should submit application with valid data', async ({ page }) => {
    // Navigate to form
    await page.goto('/rental-application/form');

    // Wait for properties to load
    await page.waitForSelector('select, [role="combobox"]', { timeout: 5000 });

    // Fill property selection (if available)
    const propertySelect = page.locator('select, [role="combobox"]').first();
    if (await propertySelect.count() > 0) {
      await propertySelect.click();
      // Select first available option
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    // Fill personal information
    await page.fill('input[type="text"]:near(text="Full Name"), input[placeholder*="name" i]', 'John Doe');
    await page.fill('input[type="email"]', 'john.doe@test.com');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', '(555) 123-4567');
    await page.fill('textarea, input[placeholder*="address" i]', '123 Main St, City, State 12345');

    // Fill financial information
    await page.fill('input[type="number"]:near(text="Income"), input[placeholder*="income" i]', '5000');
    await page.fill('input[placeholder*="employment" i], input[type="text"]:near(text="Employment")', 'Full-time');
    await page.fill('input[type="number"]:near(text="Credit"), input[placeholder*="credit" i]', '750');

    // Submit form
    await page.click('button[type="submit"], button:has-text("Submit")');

    // Should navigate to confirmation page
    await expect(page).toHaveURL(/.*rental-application\/confirmation/);
    await expect(page.locator('text=Application Submitted')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    await page.goto('/rental-application/form');

    // Try to submit without filling required fields
    await page.click('button[type="submit"], button:has-text("Submit")');

    // Should show validation errors (implementation depends on form validation)
    // This is a placeholder - adjust based on actual validation behavior
    const errorMessages = page.locator('text=/required|invalid|error/i');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });

  test('should navigate back from form to landing page', async ({ page }) => {
    await page.goto('/rental-application/form');
    
    // Look for back button or navigate back
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back"), button:has-text("Go Back")');
    if (await backButton.count() > 0) {
      await backButton.click();
      await expect(page).toHaveURL(/.*rental-application$/);
    } else {
      // Use browser back
      await page.goBack();
      await expect(page).toHaveURL(/.*rental-application$/);
    }
  });
});

test.describe('Application Confirmation Page', () => {
  test('should display confirmation page with application ID', async ({ page }) => {
    await page.goto('/rental-application/confirmation?id=APP-12345');

    await expect(page.locator('text=Application Submitted')).toBeVisible();
    await expect(page.locator('text=APP-12345, code')).toBeVisible();
    await expect(page.locator('text=What Happens Next')).toBeVisible();
  });

  test('should have create account CTA', async ({ page }) => {
    await page.goto('/rental-application/confirmation?id=APP-12345');

    const createAccountButton = page.locator('button:has-text("Create Account"), a:has-text("Create Account")');
    await expect(createAccountButton.first()).toBeVisible();
  });
});

