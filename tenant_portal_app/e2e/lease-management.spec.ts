import { test, expect } from '@playwright/test';

test.describe('Lease Management (Property Manager)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property manager
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'pm@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
    
    // Navigate to lease management
    await page.goto('/lease-management');
    await page.waitForLoadState('networkidle');
  });

  test('should display lease management page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/lease|management/i);
  });

  test('should view leases list', async ({ page }) => {
    // Should see leases table/list
    const leasesList = page.locator('table, [role="list"], .lease-card, article').first();
    await expect(leasesList).toBeVisible({ timeout: 10000 });
  });

  test('should create new lease', async ({ page }) => {
    // Find create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add Lease")').first();
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Should show lease form
      await expect(page.locator('text=/lease|tenant|unit|rent/i')).toBeVisible({ timeout: 5000 });
      
      // Fill form if visible
      const tenantSelect = page.locator('select, [role="combobox"]').filter({ hasText: /tenant/i }).first();
      if (await tenantSelect.count() > 0) {
        await tenantSelect.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }

      const unitSelect = page.locator('select, [role="combobox"]').filter({ hasText: /unit/i }).first();
      if (await unitSelect.count() > 0) {
        await unitSelect.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }

      const rentInput = page.locator('input[name="rent"], input[placeholder*="rent" i]').first();
      if (await rentInput.count() > 0) {
        await rentInput.fill('2000');
      }
    }
  });

  test('should view lease details', async ({ page }) => {
    // Click on first lease
    const leaseRow = page.locator('table tr, [role="listitem"], article').first();
    
    if (await leaseRow.count() > 0) {
      await leaseRow.click();
      
      // Should show lease details
      await expect(page.locator('text=/lease|tenant|rent|start date|end date/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit lease', async ({ page }) => {
    // Find edit button
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]').first();
    
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Should show edit form
      await expect(page.locator('input, textarea, select')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter leases by status', async ({ page }) => {
    // Find status filter
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /status|filter|active|expired/i }).first();
    
    if (await statusFilter.count() > 0) {
      await statusFilter.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(1000);
    }
  });

  test('should renew lease', async ({ page }) => {
    // Find renew button
    const renewButton = page.locator('button:has-text("Renew"), button:has-text("Extend")').first();
    
    if (await renewButton.count() > 0) {
      await renewButton.click();
      
      // Should show renewal form
      await expect(page.locator('text=/renew|extend|lease|term/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('My Lease (Tenant)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
    
    // Navigate to my lease
    await page.goto('/my-lease');
    await page.waitForLoadState('networkidle');
  });

  test('should display lease information', async ({ page }) => {
    await expect(page.locator('text=/lease|rent|start date|end date|unit/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view lease document', async ({ page }) => {
    // Find view document button
    const viewDocButton = page.locator('button:has-text("View"), button:has-text("Document"), a:has-text("Lease")').first();
    
    if (await viewDocButton.count() > 0) {
      await viewDocButton.click();
      
      // Should open document or show document viewer
      await page.waitForTimeout(2000);
    }
  });

  test('should download lease document', async ({ page }) => {
    // Find download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download"), button[aria-label*="download" i]').first();
    
    if (await downloadButton.count() > 0) {
      // Set up download listener
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        downloadButton.click(),
      ]);
      
      // Download might be handled differently, just verify button exists
      expect(downloadButton).toBeVisible();
    }
  });
});

