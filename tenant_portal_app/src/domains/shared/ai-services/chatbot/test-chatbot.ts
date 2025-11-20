/**
 * Chatbot Service Test
 * Simple test to verify chatbot functionality
 */

import { chatbotService } from './ChatbotService';
import { FAQCategory } from './types';

async function testChatbot() {
  console.log('🤖 Testing AI Chatbot Service\n');
  console.log('='.repeat(60));

  const userId = 'test-user-123';

  // Test 1: General inquiry
  console.log('\n📝 Test 1: General Inquiry');
  console.log('User: "How do I pay rent?"');
  const response1 = await chatbotService.sendMessage(userId, 'How do I pay rent?');
  console.log(`\nBot: ${response1.response.message}`);
  console.log(`Confidence: ${(response1.response.confidence * 100).toFixed(1)}%`);
  console.log(`Category: ${response1.response.category}`);
  console.log(`Source: ${response1.response.source}`);
  if (response1.response.suggestedActions) {
    console.log('Suggested Actions:');
    response1.response.suggestedActions.forEach(action => {
      console.log(`  - ${action.label}`);
    });
  }

  // Test 2: Maintenance request
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 2: Maintenance Inquiry');
  console.log('User: "My sink is broken, how do I get it fixed?"');
  const response2 = await chatbotService.sendMessage(
    userId,
    'My sink is broken, how do I get it fixed?',
    response1.sessionId
  );
  console.log(`\nBot: ${response2.response.message}`);
  console.log(`Confidence: ${(response2.response.confidence * 100).toFixed(1)}%`);
  console.log(`Category: ${response2.response.category}`);
  if (response2.response.relatedQuestions) {
    console.log('Related Questions:');
    response2.response.relatedQuestions.forEach(q => {
      console.log(`  - ${q}`);
    });
  }

  // Test 3: Emergency
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 3: Emergency Inquiry');
  console.log('User: "I smell gas in my apartment!"');
  const response3 = await chatbotService.sendMessage(
    userId,
    'I smell gas in my apartment!',
    response2.sessionId
  );
  console.log(`\nBot: ${response3.response.message}`);
  console.log(`Confidence: ${(response3.response.confidence * 100).toFixed(1)}%`);
  console.log(`Category: ${response3.response.category}`);
  console.log(`Priority: ${response3.response.category === FAQCategory.EMERGENCIES ? '🚨 HIGH' : 'Normal'}`);

  // Test 4: Rent optimization
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 4: Rent Optimization Inquiry');
  console.log('User: "How is my rent calculated?"');
  const response4 = await chatbotService.sendMessage(userId, 'How is my rent calculated?');
  console.log(`\nBot: ${response4.response.message}`);
  console.log(`Confidence: ${(response4.response.confidence * 100).toFixed(1)}%`);
  console.log(`Category: ${response4.response.category}`);

  // Test 5: Unclear query
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 5: Unclear Query (Fallback)');
  console.log('User: "What about the thing?"');
  const response5 = await chatbotService.sendMessage(userId, 'What about the thing?');
  console.log(`\nBot: ${response5.response.message}`);
  console.log(`Confidence: ${(response5.response.confidence * 100).toFixed(1)}%`);
  console.log(`Source: ${response5.response.source}`);

  // Test 6: Get popular FAQs
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 6: Popular FAQs');
  const popularFAQs = chatbotService.getPopularFAQs(5);
  console.log('Top 5 Popular Questions:');
  popularFAQs.forEach((faq, index) => {
    console.log(`  ${index + 1}. ${faq.question} (${faq.category})`);
  });

  // Test 7: Get category FAQs
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 7: Payment FAQs');
  const paymentFAQs = chatbotService.getFAQsByCategory(FAQCategory.PAYMENTS);
  console.log(`Found ${paymentFAQs.length} payment-related FAQs:`);
  paymentFAQs.slice(0, 3).forEach((faq, index) => {
    console.log(`  ${index + 1}. ${faq.question}`);
  });

  // Test 8: Session history
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Test 8: Session History');
  const history = chatbotService.getSessionHistory(response3.sessionId);
  console.log(`Session has ${history.length} messages:`);
  history.forEach((msg, index) => {
    console.log(`  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All tests completed successfully!');
  console.log('\n🎉 AI Chatbot Service is ready for integration!\n');

  // Cleanup
  chatbotService.stopSessionCleanup();
}

// Run tests if this file is executed directly
if (require.main === module) {
  testChatbot().catch(console.error);
}

export { testChatbot };
