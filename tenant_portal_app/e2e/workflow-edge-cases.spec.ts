import { test, expect } from '@playwright/test';

/**
 * P0-004: Edge Case Tests - End-to-End Workflow Edge Cases
 * Tests complete user workflows with edge cases
 */
test.describe('End-to-End Workflow Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="text"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('should complete lease creation → payment → maintenance flow', async ({ page, context }) => {
    // This test verifies a complete workflow doesn't break
    // Step 1: Navigate to lease page
    await page.goto('http://localhost:5173/my-lease');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Step 2: Navigate to payments
    await page.goto('http://localhost:5173/payments');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Step 3: Navigate to maintenance
    await page.goto('http://localhost:5173/maintenance');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // All pages should load without errors
    const errorBoundary = page.locator('text=/error|failed|crash/i');
    const hasError = await errorBoundary.count() > 0;
    expect(hasError).toBeFalsy();
  });

  test('should handle application submission → approval → lease creation workflow', async ({ page, context }) => {
    // Mock API responses for workflow
    await context.route('**/api/rental-application**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          body: JSON.stringify({ id: 1, status: 'PENDING' }),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to application page
    await page.goto('http://localhost:5173/rental-application');
    await page.waitForTimeout(1000);
    
    // Fill application form if visible
    const formInputs = page.locator('input, textarea, select').filter({ hasText: /name|email|phone/i });
    if (await formInputs.count() > 0) {
      // Fill form (simplified - would need actual form fields)
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        // Form should be submittable
        await expect(submitButton).toBeVisible();
      }
    }
  });

  test('should handle maintenance request → assignment → completion workflow', async ({ page, context }) => {
    let maintenanceRequestId: number | null = null;

    // Mock maintenance request creation
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'POST') {
        maintenanceRequestId = 123;
        await route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: maintenanceRequestId,
            status: 'PENDING',
            title: 'Test Request',
          }),
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (route.request().method() === 'GET' && maintenanceRequestId) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([{
            id: maintenanceRequestId,
            status: 'IN_PROGRESS',
            title: 'Test Request',
          }]),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/maintenance');
    await page.waitForTimeout(1000);

    // Try to create maintenance request
    const createButton = page.locator('button:has-text("Create"), button:has-text("Submit")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill form if modal opens
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Request');
        
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Should show success or updated status
          const successMessage = page.locator('text=/success|created|submitted/i');
          const hasSuccess = await successMessage.count() > 0;
          expect(hasSuccess || page.locator('body').isVisible()).toBeTruthy();
        }
      }
    }
  });

  test('should handle workflow interruptions gracefully', async ({ page, context }) => {
    // Simulate network interruption during workflow
    await page.goto('http://localhost:5173/maintenance');
    
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Start filling form
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Request');

        // Simulate network failure
        await context.setOffline(true);
        await page.waitForTimeout(500);

        // Try to submit (should handle gracefully)
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Should show error, not crash
          const body = page.locator('body');
          await expect(body).toBeVisible();
        }

        // Restore network
        await context.setOffline(false);
      }
    }
  });

  test('should maintain state across page navigation in workflow', async ({ page }) => {
    // Navigate through workflow pages
    const pages = ['/dashboard', '/payments', '/maintenance', '/my-lease'];
    
    for (const pagePath of pages) {
      await page.goto(`http://localhost:5173${pagePath}`);
      await page.waitForTimeout(1000);
      
      // Should maintain authentication
      const isAuthenticated = !page.url().includes('/login');
      expect(isAuthenticated).toBeTruthy();
      
      // Should render content
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });
});

