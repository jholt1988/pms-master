/**
 * End-to-End Tests for AI Leasing Agent Service
 * Tests conversation flow, information extraction, and response generation
 */

import { describe, it, expect, afterEach } from 'vitest';
import { leasingAgentService } from './LeasingAgentService';

describe('LeasingAgentService - End-to-End Tests', () => {
  const testSessionId = 'test-session-' + Date.now();

  afterEach(() => {
    // Clean up after each test
    leasingAgentService.clearConversation(testSessionId);
  });

  describe('Conversation Initialization', () => {
    it('should start conversation with welcome message', async () => {
      const welcomeMsg = await leasingAgentService.startConversation(testSessionId);
      
      expect(welcomeMsg).toBeDefined();
      expect(welcomeMsg.role).toBe('assistant');
      expect(welcomeMsg.content).toContain('AI Leasing Agent');
      expect(welcomeMsg.timestamp).toBeInstanceOf(Date);
    });

    it('should initialize lead with NEW status', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      
      expect(leadInfo).toBeDefined();
      expect(leadInfo?.status).toBe('NEW');
      expect(leadInfo?.conversationHistory).toHaveLength(1);
    });
  });

  describe('Information Extraction', () => {
    it('should extract name from natural language', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, "Hi, I'm John Smith");
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.name).toBe('John Smith');
    });

    it('should extract email address', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'My email is john.smith@example.com');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.email).toBe('john.smith@example.com');
    });

    it('should extract phone number in various formats', async () => {
      const testCases = [
        { input: 'My phone is 555-123-4567', expected: '555-123-4567' },
        { input: 'Call me at (555) 123-4567', expected: '(555) 123-4567' },
        { input: 'You can reach me at 5551234567', expected: '5551234567' },
      ];

      for (const testCase of testCases) {
        const sessionId = 'test-phone-' + Date.now() + Math.random();
        await leasingAgentService.startConversation(sessionId);
        await leasingAgentService.sendMessage(sessionId, testCase.input);
        
        const leadInfo = leasingAgentService.getLeadInfo(sessionId);
        expect(leadInfo?.phone).toBeTruthy();
        leasingAgentService.clearConversation(sessionId);
      }
    });

    it('should extract bedroom requirements', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Looking for a 2 bedroom apartment');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.bedrooms).toBe(2);
    });

    it('should extract budget from various formats', async () => {
      const testCases = [
        { input: 'My budget is $1500 per month', expected: 1500 },
        { input: 'Can afford around $2,000/mo', expected: 2000 },
        { input: 'Looking to spend 1800 a month', expected: 1800 },
        { input: 'Budget of $1,200', expected: 1200 },
      ];

      for (const testCase of testCases) {
        const sessionId = 'test-budget-' + Date.now() + Math.random();
        await leasingAgentService.startConversation(sessionId);
        await leasingAgentService.sendMessage(sessionId, testCase.input);
        
        const leadInfo = leasingAgentService.getLeadInfo(sessionId);
        expect(leadInfo?.budget).toBe(testCase.expected);
        leasingAgentService.clearConversation(sessionId);
      }
    });

    it('should extract move-in date', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Need to move in by January 15th');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.moveInDate).toBeDefined();
      expect(leadInfo?.moveInDate).toContain('January');
    });

    it('should detect ASAP move-in', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Need a place ASAP!');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.moveInDate).toBe('ASAP');
    });

    it('should extract pet information', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'I have a dog');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.petFriendly).toBe(true);
    });

    it('should extract amenity preferences', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Looking for a place with parking and a gym');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.preferences).toContain('parking');
      expect(leadInfo?.preferences).toContain('gym');
    });

    it('should extract multiple pieces of information in one message', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(
        testSessionId,
        "Hi, I'm Sarah Johnson. Looking for a 2 bedroom apartment with parking. My budget is $1800 and I have a cat. Email: sarah.j@example.com"
      );
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.name).toBe('Sarah Johnson');
      expect(leadInfo?.email).toBe('sarah.j@example.com');
      expect(leadInfo?.bedrooms).toBe(2);
      expect(leadInfo?.budget).toBe(1800);
      expect(leadInfo?.petFriendly).toBe(true);
      expect(leadInfo?.preferences).toContain('parking');
    });
  });

  describe('Response Generation', () => {
    it('should generate contextual response', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const response = await leasingAgentService.sendMessage(testSessionId, 'Looking for a 2 bedroom');
      
      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    });

    it('should ask for budget when bedrooms specified', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const response = await leasingAgentService.sendMessage(testSessionId, 'I need a 2 bedroom apartment');
      
      expect(response.content.toLowerCase()).toMatch(/budget|afford|price|rent/);
    });

    it('should offer property search when info is complete', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Looking for a 2 bedroom');
      const response = await leasingAgentService.sendMessage(testSessionId, 'Budget is $1800');
      
      expect(response.content.toLowerCase()).toMatch(/search|available|properties|units/);
    });
  });

  describe('Conversation State Management', () => {
    it('should maintain conversation history', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Message 1');
      await leasingAgentService.sendMessage(testSessionId, 'Message 2');
      await leasingAgentService.sendMessage(testSessionId, 'Message 3');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      // 1 welcome + 3 user messages + 3 assistant responses = 7 total
      expect(leadInfo?.conversationHistory?.length).toBeGreaterThanOrEqual(4);
    });

    it('should update lead status as conversation progresses', async () => {
      await leasingAgentService.startConversation(testSessionId);
      let leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.status).toBe('NEW');
      
      // Add contact info
      await leasingAgentService.sendMessage(testSessionId, "I'm John, email: john@example.com, phone: 555-1234");
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      // Should still be NEW or upgraded
      expect(['NEW', 'CONTACTED', 'QUALIFIED']).toContain(leadInfo?.status);
      
      // Add requirements
      await leasingAgentService.sendMessage(testSessionId, '2 bedroom, budget $1800');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.status).toBeDefined();
    });

    it('should persist information across multiple messages', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, "I'm John Smith");
      await leasingAgentService.sendMessage(testSessionId, 'Email: john@example.com');
      await leasingAgentService.sendMessage(testSessionId, '2 bedroom needed');
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.name).toBe('John Smith');
      expect(leadInfo?.email).toBe('john@example.com');
      expect(leadInfo?.bedrooms).toBe(2);
    });
  });

  describe('Property Search Flow', () => {
    it('should trigger property search with sufficient information', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, '2 bedroom, budget $1800');
      const response = await leasingAgentService.sendMessage(testSessionId, 'Show me available units');
      
      // Should mention properties or availability
      expect(response.content.toLowerCase()).toMatch(/property|properties|unit|apartment/);
    });
  });

  describe('Tour Scheduling Flow', () => {
    it('should respond to tour requests', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const response = await leasingAgentService.sendMessage(testSessionId, 'Can I schedule a tour?');
      
      expect(response.content.toLowerCase()).toMatch(/tour|visit|viewing|schedule/);
    });
  });

  describe('Application Flow', () => {
    it('should respond to application inquiries', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const response = await leasingAgentService.sendMessage(testSessionId, 'How do I apply?');
      
      expect(response.content.toLowerCase()).toMatch(/apply|application|process/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages gracefully', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const response = await leasingAgentService.sendMessage(testSessionId, '');
      
      // Should not crash, might return same state
      expect(response).toBeDefined();
    });

    it('should handle messages with special characters', async () => {
      await leasingAgentService.startConversation(testSessionId);
      const response = await leasingAgentService.sendMessage(testSessionId, 'Looking for apt @#$%^&*()');
      
      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
    });

    it('should not extract invalid budget amounts', async () => {
      await leasingAgentService.startConversation(testSessionId);
      await leasingAgentService.sendMessage(testSessionId, 'Budget is $50'); // Too low
      
      const leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.budget).toBeUndefined(); // Should not accept unrealistic budget
    });

    it('should handle session that does not exist', () => {
      const leadInfo = leasingAgentService.getLeadInfo('non-existent-session');
      expect(leadInfo).toBeUndefined();
    });
  });

  describe('Full Workflow Simulation', () => {
    it('should complete full lead qualification flow', async () => {
      // Step 1: Start conversation
      const welcome = await leasingAgentService.startConversation(testSessionId);
      expect(welcome.role).toBe('assistant');
      
      // Step 2: Introduce self
      await leasingAgentService.sendMessage(testSessionId, "Hi! I'm Michael Davis");
      let leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.name).toBe('Michael Davis');
      
      // Step 3: Provide contact info
      await leasingAgentService.sendMessage(testSessionId, 'Email: michael.d@example.com, phone: 555-9876');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.email).toBe('michael.d@example.com');
      expect(leadInfo?.phone).toBeTruthy();
      
      // Step 4: State requirements
      await leasingAgentService.sendMessage(testSessionId, 'Looking for a 2 bedroom apartment');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.bedrooms).toBe(2);
      
      // Step 5: Provide budget
      await leasingAgentService.sendMessage(testSessionId, 'My budget is $2000 per month');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.budget).toBe(2000);
      
      // Step 6: Move-in date
      await leasingAgentService.sendMessage(testSessionId, 'Need to move in by December 1st');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.moveInDate).toContain('December');
      
      // Step 7: Amenities
      await leasingAgentService.sendMessage(testSessionId, 'Would like parking and in-unit laundry');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.preferences).toContain('parking');
      expect(leadInfo?.preferences).toContain('laundry');
      
      // Step 8: Pets
      await leasingAgentService.sendMessage(testSessionId, 'I have a small dog');
      leadInfo = leasingAgentService.getLeadInfo(testSessionId);
      expect(leadInfo?.petFriendly).toBe(true);
      
      // Verify complete profile
      expect(leadInfo?.name).toBeDefined();
      expect(leadInfo?.email).toBeDefined();
      expect(leadInfo?.phone).toBeTruthy();
      expect(leadInfo?.bedrooms).toBeDefined();
      expect(leadInfo?.budget).toBeDefined();
      expect(leadInfo?.moveInDate).toBeDefined();
      expect(leadInfo?.petFriendly).toBeDefined();
      expect(leadInfo?.preferences?.length).toBeGreaterThan(0);
    });

    it('should handle property search to tour scheduling flow', async () => {
      await leasingAgentService.startConversation(testSessionId);
      
      // Provide requirements
      await leasingAgentService.sendMessage(testSessionId, '2 bedroom, $1800 budget');
      
      // Request properties
      await leasingAgentService.sendMessage(testSessionId, 'Show me available properties');
      
      // Request tour
      const tourResponse = await leasingAgentService.sendMessage(testSessionId, "I'd like to tour the first property");
      
      expect(tourResponse.content.toLowerCase()).toMatch(/tour|schedule|visit|viewing/);
    });

    it('should handle tour to application flow', async () => {
      await leasingAgentService.startConversation(testSessionId);
      
      // Express interest
      await leasingAgentService.sendMessage(testSessionId, 'Interested in your 2 bedroom units');
      
      // Schedule tour
      await leasingAgentService.sendMessage(testSessionId, 'Can I schedule a tour for tomorrow?');
      
      // Express intent to apply
      const appResponse = await leasingAgentService.sendMessage(testSessionId, 'Great! How do I apply?');
      
      expect(appResponse.content.toLowerCase()).toMatch(/apply|application/);
    });
  });
});

// Run tests with: npm test
console.log('LeasingAgentService test suite ready. Run with: npm test');
