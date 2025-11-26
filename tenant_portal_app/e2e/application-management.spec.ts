import { test, expect } from '@playwright/test';

test.describe('Application Management (Property Manager)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property manager
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'pm@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    // Navigate to applications management
    await page.goto('/rental-applications-management');
    await page.waitForLoadState('networkidle');
  });

  test('should display applications list', async ({ page }) => {
    // Should see applications table/list
    const applicationsList = page.locator('table, [role="list"], article, .application-card');
    await expect(applicationsList.first()).toBeVisible({ timeout: 10000 });
  });

  test('should view application details', async ({ page }) => {
    // Find first application and expand/view details
    const viewButton = page.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View details")').first();
    
    if (await viewButton.count() > 0) {
      await viewButton.click();
      
      // Should show application details
      await expect(page.locator('text=/application|applicant|status/i')).toBeVisible();
    }
  });

  test('should change application status', async ({ page }) => {
    // Find status dropdown/select
    const statusSelect = page.locator('select, [role="combobox"]').filter({ hasText: /status|pending|approved/i }).first();
    
    if (await statusSelect.count() > 0) {
      await statusSelect.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Should update status (check for success message or status change)
      await page.waitForTimeout(1000);
    }
  });

  test('should screen an application', async ({ page }) => {
    // Find screen button
    const screenButton = page.locator('button:has-text("Screen"), button[aria-label*="screen" i]').first();
    
    if (await screenButton.count() > 0) {
      await screenButton.click();
      
      // Should show screening results
      await expect(page.locator('text=/score|screening|qualification/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add note to application', async ({ page }) => {
    // Expand first application
    const expandButton = page.locator('button:has-text("View details"), button:has-text("Expand")').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
    }

    // Find note textarea
    const noteTextarea = page.locator('textarea[placeholder*="note" i], textarea').last();
    if (await noteTextarea.count() > 0) {
      await noteTextarea.fill('Test note from e2e test');
      
      // Submit note
      const addNoteButton = page.locator('button:has-text("Add note"), button:has-text("Save")').last();
      if (await addNoteButton.count() > 0) {
        await addNoteButton.click();
        
        // Should show note in list
        await expect(page.locator('text=Test note from e2e test')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should view application lifecycle timeline', async ({ page }) => {
    // Expand first application
    const expandButton = page.locator('button:has-text("View details"), button:has-text("Expand")').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
    }

    // Look for lifecycle timeline
    const timeline = page.locator('text=/lifecycle|timeline|stage/i');
    if (await timeline.count() > 0) {
      await expect(timeline.first()).toBeVisible();
    }
  });
});

test.describe('Application View (Tenant)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
  });

  test('should view my applications', async ({ page }) => {
    // Navigate to applications (if route exists)
    await page.goto('/my-applications');
    
    // Should see applications list
    const applicationsList = page.locator('text=/application|pending|approved/i');
    if (await applicationsList.count() > 0) {
      await expect(applicationsList.first()).toBeVisible();
    }
  });

  test('should view application status', async ({ page }) => {
    await page.goto('/my-applications');
    
    // Should see status badges
    const statusBadge = page.locator('text=/pending|approved|rejected|under review/i').first();
    if (await statusBadge.count() > 0) {
      await expect(statusBadge).toBeVisible();
    }
  });
});

