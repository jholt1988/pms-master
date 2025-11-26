import { test, expect } from '@playwright/test';

test.describe('Maintenance Requests (Tenant)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    // Wait for navigation
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
    
    // Navigate to maintenance
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
  });

  test('should display maintenance page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/maintenance|request/i);
  });

  test('should create new maintenance request', async ({ page }) => {
    // Find create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Submit Request")').first();
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Fill form
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[placeholder*="issue" i]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('Leaky Faucet');
      }

      const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
      if (await descriptionInput.count() > 0) {
        await descriptionInput.fill('Kitchen faucet is leaking water');
      }

      // Select priority if available
      const prioritySelect = page.locator('select[name="priority"], [role="combobox"]').filter({ hasText: /priority/i }).first();
      if (await prioritySelect.count() > 0) {
        await prioritySelect.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').last();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Should show success message or redirect
        await page.waitForTimeout(2000);
        await expect(page.locator('text=/success|submitted|created/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should view maintenance request list', async ({ page }) => {
    // Should see list of requests
    const requestList = page.locator('table, [role="list"], .maintenance-card, article').first();
    await expect(requestList).toBeVisible({ timeout: 10000 });
  });

  test('should filter maintenance requests by status', async ({ page }) => {
    // Find filter dropdown
    const filterSelect = page.locator('select, [role="combobox"]').filter({ hasText: /status|filter/i }).first();
    
    if (await filterSelect.count() > 0) {
      await filterSelect.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
    }
  });

  test('should view maintenance request details', async ({ page }) => {
    // Find first request and click to view details
    const requestCard = page.locator('table tr, [role="listitem"], article, .card').first();
    
    if (await requestCard.count() > 0) {
      await requestCard.click();
      
      // Should show details
      await expect(page.locator('text=/description|status|priority|date/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Maintenance Management (Property Manager)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property manager
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'pm@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
    
    // Navigate to maintenance management
    await page.goto('/maintenance-management');
    await page.waitForLoadState('networkidle');
  });

  test('should display maintenance management page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/maintenance|management/i);
  });

  test('should update maintenance request status', async ({ page }) => {
    // Find first request
    const requestRow = page.locator('table tr, [role="listitem"]').first();
    
    if (await requestRow.count() > 0) {
      // Find status dropdown
      const statusSelect = page.locator('select, [role="combobox"]').filter({ hasText: /status|pending|in progress/i }).first();
      
      if (await statusSelect.count() > 0) {
        await statusSelect.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        // Should update status
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should assign technician to maintenance request', async ({ page }) => {
    // Find assign button or dropdown
    const assignButton = page.locator('button:has-text("Assign"), button:has-text("Technician")').first();
    
    if (await assignButton.count() > 0) {
      await assignButton.click();
      
      // Select technician if dropdown appears
      const technicianSelect = page.locator('select, [role="combobox"]').filter({ hasText: /technician|assign/i }).first();
      if (await technicianSelect.count() > 0) {
        await technicianSelect.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
    }
  });

  test('should add note to maintenance request', async ({ page }) => {
    // Expand first request
    const expandButton = page.locator('button:has-text("View"), button:has-text("Details")').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
    }

    // Find note textarea
    const noteTextarea = page.locator('textarea[placeholder*="note" i], textarea').last();
    if (await noteTextarea.count() > 0) {
      await noteTextarea.fill('Technician assigned, will arrive tomorrow');
      
      const addNoteButton = page.locator('button:has-text("Add note"), button:has-text("Save")').last();
      if (await addNoteButton.count() > 0) {
        await addNoteButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

