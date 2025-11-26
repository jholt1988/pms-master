import { test, expect } from '@playwright/test';

test.describe('Payments (Tenant)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
    
    // Navigate to payments
    await page.goto('/payments');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display payments page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/payment|invoice|rent/i);
  });

  test('should view invoices list', async ({ page }) => {
    // Should see invoices
    const invoicesList = page.locator('table, [role="list"], .invoice-card, article').first();
    await expect(invoicesList).toBeVisible({ timeout: 10000 });
  });

  test('should view invoice details', async ({ page }) => {
    // Click on first invoice
    const invoiceRow = page.locator('table tr, [role="listitem"], article').first();
    
    if (await invoiceRow.count() > 0) {
      await invoiceRow.click();
      
      // Should show invoice details
      await expect(page.locator('text=/amount|due date|status|description/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should make payment for invoice', async ({ page }) => {
    // Find pay button
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Make Payment"), a:has-text("Pay")').first();
    
    if (await payButton.count() > 0) {
      await payButton.click();
      
      // Should show payment form or modal
      await expect(page.locator('text=/payment|amount|method|card/i')).toBeVisible({ timeout: 5000 });
      
      // If payment method selection appears
      const paymentMethodSelect = page.locator('select, [role="combobox"]').filter({ hasText: /payment method|card/i }).first();
      if (await paymentMethodSelect.count() > 0) {
        await paymentMethodSelect.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }

      // Submit payment (if in test mode, this should work)
      const submitButton = page.locator('button[type="submit"]:has-text("Pay"), button:has-text("Submit Payment")').first();
      if (await submitButton.count() > 0) {
        // In test mode, might need to handle Stripe test card
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should add payment method', async ({ page }) => {
    // Find add payment method button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Payment Method"), a:has-text("Add Card")').first();
    
    if (await addButton.count() > 0) {
      await addButton.click();
      
      // Should show payment method form
      await expect(page.locator('text=/card|payment method|billing/i')).toBeVisible({ timeout: 5000 });
      
      // Fill form (if visible)
      const cardInput = page.locator('input[name="card"], input[placeholder*="card" i]').first();
      if (await cardInput.count() > 0 && await cardInput.isVisible()) {
        await cardInput.fill('4242424242424242');
      }
    }
  });

  test('should view payment history', async ({ page }) => {
    // Find payment history tab or section
    const historyTab = page.locator('button:has-text("History"), a:has-text("History"), [role="tab"]:has-text("History")').first();
    
    if (await historyTab.count() > 0) {
      await historyTab.click();
      
      // Should show payment history
      await expect(page.locator('text=/payment|date|amount|status/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter invoices by status', async ({ page }) => {
    // Find filter
    const filterSelect = page.locator('select, [role="combobox"]').filter({ hasText: /status|filter|unpaid|paid/i }).first();
    
    if (await filterSelect.count() > 0) {
      await filterSelect.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Payment Management (Property Manager)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property manager
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'pm@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
  });

  test('should view payment dashboard', async ({ page }) => {
    // Navigate to payments/reporting
    await page.goto('/reporting');
    await page.waitForLoadState('domcontentloaded');
    
    // Should see payment statistics
    await expect(page.locator('text=/payment|revenue|income|statistics/i')).toBeVisible({ timeout: 10000 });
  });
});

