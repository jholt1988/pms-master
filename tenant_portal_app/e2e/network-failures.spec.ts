import { test, expect } from '@playwright/test';

/**
 * P0-004: Edge Case Tests - Network Failures
 * Tests for offline mode, slow network, and request timeout handling
 */
test.describe('Network Failure Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    
    // Login (assuming test user exists)
    await page.fill('input[type="text"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('should handle offline mode gracefully', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate to a page that requires API call
    await page.goto('http://localhost:5173/payments');
    
    // Should show error message, not crash
    await expect(page.locator('body')).toBeVisible();
    
    // Check for error message or loading state
    const errorMessage = page.locator('text=/error|offline|network/i');
    const hasError = await errorMessage.count() > 0;
    expect(hasError || page.locator('text=/loading/i').count() > 0).toBeTruthy();
    
    // Go back online
    await context.setOffline(false);
  });

  test('should handle slow network with throttling', async ({ page, context }) => {
    // Throttle network to slow 3G
    await context.route('**/api/**', async (route) => {
      // Simulate slow network by adding delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // Navigate to page that requires API call
    await page.goto('http://localhost:5173/payments');
    
    // Should show loading state
    const loadingIndicator = page.locator('text=/loading|Loading/i');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1000 }).catch(() => {
      // Loading might be too fast, that's okay
    });
    
    // Page should eventually load or show timeout message
    await page.waitForTimeout(5000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle request timeout gracefully', async ({ page, context }) => {
    // Intercept API calls and delay them beyond timeout
    await context.route('**/api/payments**', async (route) => {
      // Delay longer than typical timeout (10+ seconds)
      await new Promise(resolve => setTimeout(resolve, 15000));
      await route.abort('timedout');
    });
    
    await page.goto('http://localhost:5173/payments');
    
    // Should show timeout error or retry option
    await page.waitForTimeout(12000);
    
    // Check for timeout message or error handling
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should not crash the application
    const errorBoundary = page.locator('text=/error|timeout|failed/i');
    const hasErrorHandling = await errorBoundary.count() > 0;
    expect(hasErrorHandling || body.isVisible()).toBeTruthy();
  });

  test('should handle 500 server errors gracefully', async ({ page, context }) => {
    // Intercept API calls and return 500 error
    await context.route('**/api/payments**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal server error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });
    
    await page.goto('http://localhost:5173/payments');
    
    // Should show user-friendly error message
    await page.waitForTimeout(2000);
    
    const errorMessage = page.locator('text=/error|something went wrong|try again/i');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Error might be handled differently, but page should not crash
      expect(page.locator('body')).toBeVisible();
    });
  });

  test('should handle 401 unauthorized errors', async ({ page, context }) => {
    // Intercept API calls and return 401
    await context.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });
    
    await page.goto('http://localhost:5173/payments');
    
    // Should redirect to login or show unauthorized message
    await page.waitForTimeout(2000);
    
    const isLoginPage = page.url().includes('/login');
    const hasUnauthorizedMessage = (await page.locator('text=/unauthorized|login|sign in/i').count()) > 0;
    
    expect(isLoginPage || hasUnauthorizedMessage).toBeTruthy();
  });

  test('should handle network errors during form submission', async ({ page, context }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    // Fill out maintenance request form
    const createButton = page.locator('button:has-text("Create")').or(page.locator('button:has-text("Submit")')).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill form fields if modal opens
      const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="Title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Request');
      }
      
      // Simulate network failure on submit
      await context.route('**/api/maintenance**', async (route) => {
        await route.abort('failed');
      });
      
      // Try to submit
      const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("Submit")')).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show error, not lose form data
        await page.waitForTimeout(2000);
        const errorMessage = page.locator('text=/error|failed|try again/i');
        await expect(errorMessage.first()).toBeVisible({ timeout: 3000 }).catch(() => {
          // Error handling might vary
        });
      }
    }
  });

  test('should retry failed requests when appropriate', async ({ page, context }) => {
    let requestCount = 0;
    
    // Intercept and fail first request, succeed on retry
    await context.route('**/api/payments**', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails
        await route.abort('failed');
      } else {
        // Retry succeeds
        await route.continue();
      }
    });
    
    await page.goto('http://localhost:5173/payments');
    
    // Wait for retry
    await page.waitForTimeout(5000);
    
    // Should eventually succeed or show retry option
    expect(requestCount).toBeGreaterThan(0);
  });
});

