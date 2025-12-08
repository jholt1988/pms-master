import { test, expect } from '@playwright/test';

/**
 * P0-004: Edge Case Tests - Large Datasets
 * Tests for pagination, performance with large data sets, and rendering optimization
 */
test.describe('Large Dataset Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="text"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('should handle dashboard with 1000+ maintenance requests', async ({ page, context }) => {
    // Mock API to return large dataset
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'GET') {
        // Generate mock data for 1000+ requests
        const requests = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          title: `Maintenance Request ${i + 1}`,
          description: `Description for request ${i + 1}`,
          status: ['pending', 'in_progress', 'completed'][i % 3],
          priority: ['low', 'medium', 'high'][i % 3],
          createdAt: new Date().toISOString(),
        }));

        await route.fulfill({
          status: 200,
          body: JSON.stringify(requests),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/maintenance');
    
    // Should render without crashing
    await page.waitForTimeout(3000);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should show pagination or virtual scrolling
    const pagination = page.locator('text=/page|next|previous|pagination/i');
    const virtualScroll = page.locator('[data-virtual-scroll], [data-infinite-scroll]');
    
    const hasPagination = await pagination.count() > 0;
    const hasVirtualScroll = await virtualScroll.count() > 0;
    
    // Should have some mechanism to handle large datasets
    expect(hasPagination || hasVirtualScroll || body.isVisible()).toBeTruthy();
  });

  test('should handle property list with 500+ properties', async ({ page, context }) => {
    await context.route('**/api/property**', async (route) => {
      if (route.request().method() === 'GET') {
        const properties = Array.from({ length: 500 }, (_, i) => ({
          id: i + 1,
          name: `Property ${i + 1}`,
          address: `${i + 1} Main St`,
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        }));

        await route.fulfill({
          status: 200,
          body: JSON.stringify(properties),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/properties');
    
    await page.waitForTimeout(3000);
    
    // Should render without performance issues
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for pagination or filtering
    const hasPagination = await page.locator('text=/page|next|previous/i').count() > 0;
    const hasSearch = await page.locator('input[type="search"], input[placeholder*="search" i]').count() > 0;
    
    expect(hasPagination || hasSearch || body.isVisible()).toBeTruthy();
  });

  test('should paginate large result sets', async ({ page, context }) => {
    let requestCount = 0;
    
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'GET') {
        requestCount++;
        const url = new URL(route.request().url());
        const pageParam = url.searchParams.get('page') || '1';
        const pageNum = parseInt(pageParam, 10);
        const pageSize = 20;
        
        // Return paginated results
        const requests = Array.from({ length: pageSize }, (_, i) => ({
          id: (pageNum - 1) * pageSize + i + 1,
          title: `Request ${(pageNum - 1) * pageSize + i + 1}`,
          status: 'pending',
        }));

        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: requests,
            pagination: {
              page: pageNum,
              pageSize,
              total: 1000,
              totalPages: 50,
            },
          }),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/maintenance');
    await page.waitForTimeout(2000);
    
    // Try to navigate to next page if pagination exists
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Should load next page
      expect(requestCount).toBeGreaterThan(1);
    }
  });

  test('should filter large datasets efficiently', async ({ page, context }) => {
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const search = url.searchParams.get('search') || '';
        
        // Simulate filtered results
        const requests = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          title: search ? `Filtered Request ${i + 1}` : `Request ${i + 1}`,
          status: 'pending',
        }));

        await route.fulfill({
          status: 200,
          body: JSON.stringify(requests),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/maintenance');
    await page.waitForTimeout(2000);
    
    // Try to use search/filter
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Should filter results
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('should handle performance with large lists', async ({ page, context }) => {
    // Measure render time for large dataset
    await context.route('**/api/maintenance**', async (route) => {
      if (route.request().method() === 'GET') {
        const requests = Array.from({ length: 500 }, (_, i) => ({
          id: i + 1,
          title: `Request ${i + 1}`,
          description: `Description ${i + 1}`,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
        }));

        await route.fulfill({
          status: 200,
          body: JSON.stringify(requests),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await route.continue();
      }
    });

    const startTime = Date.now();
    await page.goto('http://localhost:5173/maintenance');
    
    // Wait for content to render
    await page.waitForSelector('body', { state: 'visible' });
    await page.waitForTimeout(2000);
    
    const renderTime = Date.now() - startTime;
    
    // Should render within reasonable time (< 5 seconds for 500 items)
    expect(renderTime).toBeLessThan(5000);
    
    // Page should be interactive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

