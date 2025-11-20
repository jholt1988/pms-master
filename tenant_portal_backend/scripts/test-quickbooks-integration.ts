#!/usr/bin/env ts-node

/**
 * QuickBooks Integration Testing Script
 * 
 * This script tests the QuickBooks integration end-to-end by:
 * 1. Checking environment configuration
 * 2. Testing OAuth URL generation
 * 3. Testing connection status
 * 4. Testing disconnect functionality
 * 5. Testing basic sync
 * 
 * Usage:
 *   npm run test:quickbooks
 *   OR
 *   ts-node scripts/test-quickbooks-integration.ts
 * 
 * Prerequisites:
 *   - Backend server running on localhost:3001
 *   - Valid JWT token for authentication
 *   - QuickBooks environment variables configured
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Test configuration
const TEST_CONFIG = {
  // Use a test user ID - in real app this would come from JWT
  userId: 1,
  // Mock JWT token for testing - replace with real token in actual testing
  authToken: 'mock_jwt_token_for_testing',
};

class QuickBooksIntegrationTester {
  private authHeaders: any;

  constructor() {
    this.authHeaders = {
      'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  async checkEnvironmentConfig(): Promise<boolean> {
    console.log('🔍 Checking environment configuration...');
    
    const requiredEnvVars = [
      'QUICKBOOKS_CLIENT_ID',
      'QUICKBOOKS_CLIENT_SECRET', 
      'QUICKBOOKS_REDIRECT_URI',
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:', missing.join(', '));
      console.error('   Please ensure these are set in your .env file');
      return false;
    }

    console.log('✅ Environment configuration looks good');
    console.log(`   Client ID: ${process.env.QUICKBOOKS_CLIENT_ID?.substring(0, 8)}...`);
    console.log(`   Redirect URI: ${process.env.QUICKBOOKS_REDIRECT_URI}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    
    return true;
  }

  async testServerHealth(): Promise<boolean> {
    console.log('\\n🏥 Testing server health...');
    
    try {
      const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ Server is healthy and responding');
        return true;
      } else {
        console.error(`❌ Server health check failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Server health check failed:', error instanceof Error ? error.message : 'Unknown error');
      console.error('   Make sure the backend server is running on', BASE_URL);
      return false;
    }
  }

  async testAuthorizationUrl(): Promise<boolean> {
    console.log('\\n🔐 Testing QuickBooks authorization URL generation...');
    
    try {
      const response = await axios.get(
        `${API_BASE}/quickbooks/auth-url`,
        { headers: this.authHeaders, timeout: 10000 }
      );

      if (response.status === 200 && response.data.authUrl) {
        console.log('✅ Authorization URL generated successfully');
        console.log('   URL:', response.data.authUrl.substring(0, 100) + '...');
        
        // Validate URL structure
        const authUrl = response.data.authUrl;
        const requiredParams = ['client_id', 'scope', 'redirect_uri', 'state'];
        const hasAllParams = requiredParams.every(param => authUrl.includes(param));
        
        if (hasAllParams) {
          console.log('✅ Authorization URL contains all required parameters');
          return true;
        } else {
          console.error('❌ Authorization URL missing required parameters');
          return false;
        }
      } else {
        console.error('❌ Failed to generate authorization URL');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Authorization URL test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testConnectionStatus(): Promise<boolean> {
    console.log('\\n📊 Testing connection status endpoint...');
    
    try {
      const response = await axios.get(
        `${API_BASE}/quickbooks/status`,
        { headers: this.authHeaders, timeout: 10000 }
      );

      if (response.status === 200) {
        console.log('✅ Connection status endpoint responding');
        console.log('   Connected:', response.data.connected);
        console.log('   Company:', response.data.companyName || 'Not connected');
        console.log('   Last Sync:', response.data.lastSync || 'Never');
        return true;
      } else {
        console.error('❌ Connection status check failed');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Connection status test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testBasicSync(): Promise<boolean> {
    console.log('\\n🔄 Testing basic sync functionality...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/quickbooks/sync`,
        {},
        { headers: this.authHeaders, timeout: 30000 }
      );

      if (response.status === 200) {
        console.log('✅ Basic sync endpoint responding');
        console.log('   Success:', response.data.success);
        console.log('   Message:', response.data.message);
        console.log('   Synced Items:', response.data.syncedItems || 0);
        return true;
      } else {
        console.error('❌ Basic sync test failed');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Basic sync test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testDisconnect(): Promise<boolean> {
    console.log('\\n🔌 Testing disconnect functionality...');
    
    try {
      const response = await axios.post(
        `${API_BASE}/quickbooks/disconnect`,
        {},
        { headers: this.authHeaders, timeout: 10000 }
      );

      if (response.status === 200) {
        console.log('✅ Disconnect endpoint responding');
        console.log('   Success:', response.data.success);
        console.log('   Message:', response.data.message);
        return true;
      } else {
        console.error('❌ Disconnect test failed');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Disconnect test failed:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 QuickBooks Integration Test Suite');
    console.log('=====================================\\n');

    const results = {
      environment: await this.checkEnvironmentConfig(),
      server: await this.testServerHealth(),
      authUrl: await this.testAuthorizationUrl(),
      status: await this.testConnectionStatus(),
      sync: await this.testBasicSync(),
      disconnect: await this.testDisconnect(),
    };

    console.log('\\n📈 Test Results Summary');
    console.log('========================');
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.padEnd(12)} - ${this.getTestDescription(test)}`);
    });

    const passCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.values(results).length;
    const passRate = Math.round((passCount / totalCount) * 100);

    console.log(`\\n🎯 Overall Result: ${passCount}/${totalCount} tests passed (${passRate}%)`);

    if (passCount === totalCount) {
      console.log('\\n🎉 All tests passed! QuickBooks integration is ready for manual OAuth testing.');
      console.log('\\nNext steps:');
      console.log('1. Set up a QuickBooks Sandbox account at https://developer.intuit.com/');
      console.log('2. Create a QuickBooks app and get your Client ID and Secret');
      console.log('3. Update your .env file with the real credentials');
      console.log('4. Test the complete OAuth flow with a real QuickBooks account');
    } else {
      console.log('\\n⚠️  Some tests failed. Please fix the issues before proceeding.');
      
      if (!results.environment) {
        console.log('\\n🔧 Environment Fix Required:');
        console.log('   Copy .env.example to .env and fill in QuickBooks credentials');
      }
      
      if (!results.server) {
        console.log('\\n🚀 Server Fix Required:');
        console.log('   Start the backend server: cd tenant_portal_backend && npm start');
      }
    }
  }

  private getTestDescription(testName: string): string {
    const descriptions: { [key: string]: string } = {
      environment: 'Environment variables configuration',
      server: 'Backend server health and connectivity',
      authUrl: 'OAuth authorization URL generation',
      status: 'Connection status endpoint',
      sync: 'Basic synchronization functionality',
      disconnect: 'Connection disconnect functionality',
    };
    
    return descriptions[testName] || testName;
  }

  async interactiveOAuthTest(): Promise<void> {
    console.log('\\n🔗 Interactive OAuth Flow Test');
    console.log('================================');
    console.log('This will generate a real QuickBooks authorization URL.');
    console.log('You can use this to test the complete OAuth flow manually.\\n');

    try {
      // Generate auth URL
      const response = await axios.get(
        `${API_BASE}/quickbooks/auth-url`,
        { headers: this.authHeaders }
      );

      if (response.data.authUrl) {
        console.log('🔗 Authorization URL:');
        console.log(response.data.authUrl);
        console.log('\\n📝 Manual Testing Steps:');
        console.log('1. Copy the URL above and paste it into your browser');
        console.log('2. Sign in with your QuickBooks developer account');
        console.log('3. Create or select a sandbox company');
        console.log('4. Grant the requested permissions');
        console.log('5. You should be redirected to your callback URL');
        console.log('6. Check the server logs for the callback processing');
        console.log('\\n⚠️  Note: Make sure your backend server is running to handle the callback!');
      }
    } catch (error) {
      console.error('❌ Failed to generate OAuth URL for manual testing:', error);
    }
  }
}

// Main execution
async function main() {
  const tester = new QuickBooksIntegrationTester();

  // Check if we should run interactive mode
  const args = process.argv.slice(2);
  if (args.includes('--interactive') || args.includes('-i')) {
    await tester.interactiveOAuthTest();
    return;
  }

  // Run all automated tests
  await tester.runAllTests();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { QuickBooksIntegrationTester };