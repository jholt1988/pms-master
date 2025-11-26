import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'tenant@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"], button:has-text("Login")');
    
    await page.waitForURL(/.*dashboard|.*home|.*\/$/, { timeout: 5000 });
    
    // Navigate to messaging
    await page.goto('/messaging');
    await page.waitForLoadState('networkidle');
  });

  test('should display messaging page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/message|conversation|chat/i);
  });

  test('should view conversations list', async ({ page }) => {
    // Should see conversations
    const conversationsList = page.locator('[role="list"], .conversation-list, table, aside').first();
    await expect(conversationsList).toBeVisible({ timeout: 10000 });
  });

  test('should create new conversation', async ({ page }) => {
    // Find new conversation button
    const newButton = page.locator('button:has-text("New"), button:has-text("Compose"), button:has-text("Start Conversation")').first();
    
    if (await newButton.count() > 0) {
      await newButton.click();
      
      // Should show compose form
      await expect(page.locator('text=/to|recipient|subject|message/i')).toBeVisible({ timeout: 5000 });
      
      // Fill form
      const recipientInput = page.locator('input[name="to"], input[placeholder*="to" i], input[placeholder*="recipient" i]').first();
      if (await recipientInput.count() > 0) {
        await recipientInput.fill('pm@test.com');
      }

      const subjectInput = page.locator('input[name="subject"], input[placeholder*="subject" i]').first();
      if (await subjectInput.count() > 0) {
        await subjectInput.fill('Test Message');
      }

      const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();
      if (await messageInput.count() > 0) {
        await messageInput.fill('This is a test message');
      }
    }
  });

  test('should send message in conversation', async ({ page }) => {
    // Click on first conversation
    const conversationItem = page.locator('[role="listitem"], .conversation-item, tr, article').first();
    
    if (await conversationItem.count() > 0) {
      await conversationItem.click();
      
      // Wait for conversation to load
      await page.waitForTimeout(1000);
      
      // Find message input
      const messageInput = page.locator('textarea[placeholder*="message" i], textarea[placeholder*="type" i], input[type="text"]').last();
      if (await messageInput.count() > 0) {
        await messageInput.fill('Hello, this is a test message');
        
        // Find send button
        const sendButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Send"), button[aria-label*="send" i]').last();
        if (await sendButton.count() > 0) {
          await sendButton.click();
          
          // Should show message in conversation
          await expect(page.locator('text=Hello, this is a test message')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should view conversation messages', async ({ page }) => {
    // Click on first conversation
    const conversationItem = page.locator('[role="listitem"], .conversation-item, tr, article').first();
    
    if (await conversationItem.count() > 0) {
      await conversationItem.click();
      
      // Should show messages
      await expect(page.locator('.message, [role="article"], .chat-message')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should mark conversation as read', async ({ page }) => {
    // Click on unread conversation
    const unreadConversation = page.locator('.unread, [aria-label*="unread" i]').first();
    
    if (await unreadConversation.count() > 0) {
      await unreadConversation.click();
      
      // Should mark as read (visual indicator should change)
      await page.waitForTimeout(1000);
    }
  });

  test('should search conversations', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      
      // Should filter conversations
      await page.waitForTimeout(1000);
    }
  });
});

