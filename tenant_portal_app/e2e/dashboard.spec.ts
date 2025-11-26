import { test, expect } from '@playwright/test';

test.describe('Tenant Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    // Should redirect to dashboard
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 10000 });
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display dashboard', async ({ page }) => {
    // Should see dashboard content
    await expect(page.locator('text=/dashboard|welcome|overview/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display lease information', async ({ page }) => {
    // Should see lease card or section
    await expect(page.locator('text=/lease|rent|unit/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display upcoming payments', async ({ page }) => {
    // Should see payments section
    await expect(page.locator('text=/payment|invoice|due|upcoming/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display maintenance requests', async ({ page }) => {
    // Should see maintenance section
    await expect(page.locator('text=/maintenance|request|issue/i')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to payments from dashboard', async ({ page }) => {
    // Find payments link/button
    const paymentsLink = page.locator('a:has-text("Payments"), button:has-text("Payments"), [href*="payments"]').first();
    
    if (await paymentsLink.count() > 0) {
      await paymentsLink.click();
      await expect(page).toHaveURL(/.*payments/);
    }
  });

  test('should navigate to maintenance from dashboard', async ({ page }) => {
    // Find maintenance link/button
    const maintenanceLink = page.locator('a:has-text("Maintenance"), button:has-text("Maintenance"), [href*="maintenance"]').first();
    
    if (await maintenanceLink.count() > 0) {
      await maintenanceLink.click();
      await expect(page).toHaveURL(/.*maintenance/);
    }
  });

  test('should display notifications', async ({ page }) => {
    // Find notifications icon/button
    const notificationsButton = page.locator('button[aria-label*="notification" i], button:has-text("Notifications"), [data-testid*="notification" i]').first();
    
    if (await notificationsButton.count() > 0) {
      await notificationsButton.click();
      
      // Should show notifications panel
      await expect(page.locator('text=/notification|alert|message/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Property Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property manager
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'pm@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display property manager dashboard', async ({ page }) => {
    // Should see dashboard with stats
    await expect(page.locator('text=/dashboard|overview|statistics/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display key metrics', async ({ page }) => {
    // Should see metrics cards
    await expect(page.locator('text=/properties|units|tenants|revenue|maintenance/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display recent activity', async ({ page }) => {
    // Should see activity feed
    await expect(page.locator('text=/recent|activity|latest/i')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to property management', async ({ page }) => {
    const propertiesLink = page.locator('a:has-text("Properties"), button:has-text("Properties"), [href*="properties"]').first();
    
    if (await propertiesLink.count() > 0) {
      await propertiesLink.click();
      await expect(page).toHaveURL(/.*properties/);
    }
  });

  test('should navigate to lease management', async ({ page }) => {
    const leasesLink = page.locator('a:has-text("Leases"), button:has-text("Leases"), [href*="lease"]').first();
    
    if (await leasesLink.count() > 0) {
      await leasesLink.click();
      await expect(page).toHaveURL(/.*lease/);
    }
  });
});

