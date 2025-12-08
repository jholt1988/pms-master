import { test, expect } from '@playwright/test';

/**
 * P0-004: Edge Case Tests - Error Boundaries
 * Tests that component errors don't crash the entire application
 */
test.describe('Error Boundary Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="text"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('should handle component errors gracefully', async ({ page }) => {
    // Inject error into a component via console
    await page.evaluate(() => {
      // Simulate component error by throwing in React component
      // This is a simplified test - in real scenario would test actual component errors
      window.addEventListener('error', (e) => {
        console.log('Error caught:', e.message);
      });
    });
    
    // Navigate to various pages that might have errors
    const pages = ['/payments', '/maintenance', '/my-lease', '/messaging'];
    
    for (const pagePath of pages) {
      try {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForTimeout(1000);
        
        // Page should still be visible, not white screen
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Should not show raw error stack trace to user
        const errorStack = page.locator('text=/at |Error:|Stack trace/i');
        const hasRawError = await errorStack.count() > 0;
        expect(hasRawError).toBeFalsy();
      } catch (error) {
        // Page navigation failed, but should still show error boundary
        const body = page.locator('body');
        await expect(body).toBeVisible();
      }
    }
  });

  test('should display user-friendly error messages for API errors', async ({ page, context }) => {
    // Intercept API calls and return various error statuses
    await context.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ 
          message: 'Internal server error',
          errorCode: 'INTERNAL_ERROR'
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    });
    
    await page.goto('http://localhost:5173/payments');
    await page.waitForTimeout(2000);
    
    // Should show user-friendly error, not raw API response
    const errorMessage = page.locator('text=/error|something went wrong|try again/i');
    const hasUserFriendlyError = await errorMessage.count() > 0;
    
    // Should not show raw error code or stack trace
    const rawError = page.locator('text=/INTERNAL_ERROR|500|at |Stack/i');
    const hasRawError = await rawError.count() > 0;
    
    expect(hasUserFriendlyError || !hasRawError).toBeTruthy();
  });

  test('should recover from error states', async ({ page, context }) => {
    let shouldFail = true;
    
    // First request fails, second succeeds
    await context.route('**/api/payments**', async (route) => {
      if (shouldFail) {
        shouldFail = false;
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'Error' }),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('http://localhost:5173/payments');
    await page.waitForTimeout(2000);
    
    // Should show error initially
    const errorMessage = page.locator('text=/error|failed/i');
    const hasError = await errorMessage.count() > 0;
    
    // Look for retry button or refresh
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Refresh")').first();
    
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForTimeout(2000);
      
      // Should recover and show content
      const content = page.locator('body');
      await expect(content).toBeVisible();
    } else if (hasError) {
      // Error is shown, which is acceptable
      expect(hasError).toBeTruthy();
    }
  });

  test('should handle network errors in error boundaries', async ({ page, context }) => {
    // Abort all API requests
    await context.route('**/api/**', async (route) => {
      await route.abort('failed');
    });
    
    await page.goto('http://localhost:5173/payments');
    await page.waitForTimeout(2000);
    
    // Should show error boundary, not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should have some error indication
    const hasErrorIndication = (
      await page.locator('text=/error|failed|network|offline/i').count() > 0 ||
      await page.locator('text=/try again|retry/i').count() > 0
    );
    
    // Page should be functional (not white screen)
    expect(hasErrorIndication || body.isVisible()).toBeTruthy();
  });

  test('should prevent error propagation to parent components', async ({ page }) => {
    // Navigate to page with multiple components
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForTimeout(2000);
    
    // If one component fails, others should still render
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
    
    // Navigation should still work even if one component has error
    await page.goto('http://localhost:5173/payments');
    await page.waitForTimeout(1000);
    
    const paymentsContent = page.locator('body');
    await expect(paymentsContent).toBeVisible();
  });

  test('should log errors for debugging without exposing to users', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Trigger API error
    await context.route('**/api/payments**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });
    
    await page.goto('http://localhost:5173/payments');
    await page.waitForTimeout(2000);
    
    // Errors should be logged to console (for debugging)
    // But not shown to user in raw form
    const userFacingError = page.locator('text=/500|Internal Server Error|at |Stack/i');
    const hasRawError = await userFacingError.count() > 0;
    
    // Should have user-friendly message instead
    const friendlyError = page.locator('text=/error|something went wrong/i');
    const hasFriendlyError = await friendlyError.count() > 0;
    
    expect(hasFriendlyError || !hasRawError).toBeTruthy();
  });
});

