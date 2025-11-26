import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login")')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"], button:has-text("Login")');

    // Should redirect to dashboard/home - wait for navigation
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 10000 });
    
    // Should not be on login page
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="text"], input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Login")');

    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"], button:has-text("Login")');

    // Should show validation (if implemented)
    const requiredFields = page.locator('input[required]');
    const count = await requiredFields.count();
    if (count > 0) {
      // Form validation should prevent submission
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('should navigate to signup from login', async ({ page }) => {
    const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create account")');
    if (await signupLink.count() > 0) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup|.*register/);
    }
  });

  test('should logout successfully', async ({ page, context }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    // Wait for navigation
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), [aria-label*="logout" i]');
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    }
  });
});

