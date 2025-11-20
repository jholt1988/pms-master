const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3001';

console.log(chalk.blue.bold('\n🔍 QuickBooks Integration - Pre-Testing Validation\n'));
console.log(chalk.gray('='.repeat(60)));

async function validateSetup() {
  const checks = [];
  
  // 1. Check server is running
  console.log(chalk.yellow('\n1. Checking server status...'));
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    checks.push({ name: 'Server Running', status: 'PASS', detail: response.data });
    console.log(chalk.green('   ✓ Server is running'));
  } catch (error) {
    checks.push({ name: 'Server Running', status: 'FAIL', detail: error.message });
    console.log(chalk.red('   ✗ Server is NOT running'));
    console.log(chalk.red('   → Run: cd tenant_portal_backend && npm start'));
    return false;
  }

  // 2. Check environment variables
  console.log(chalk.yellow('\n2. Checking QuickBooks environment variables...'));
  const envVars = {
    'QUICKBOOKS_CLIENT_ID': process.env.QUICKBOOKS_CLIENT_ID,
    'QUICKBOOKS_CLIENT_SECRET': process.env.QUICKBOOKS_CLIENT_SECRET,
    'QUICKBOOKS_REDIRECT_URI': process.env.QUICKBOOKS_REDIRECT_URI,
    'QUICKBOOKS_ENVIRONMENT': process.env.QUICKBOOKS_ENVIRONMENT
  };

  let envConfigured = true;
  for (const [key, value] of Object.entries(envVars)) {
    if (!value || value.includes('your_') || value.includes('placeholder')) {
      checks.push({ name: key, status: 'FAIL', detail: 'Not configured' });
      console.log(chalk.red(`   ✗ ${key} not configured`));
      envConfigured = false;
    } else {
      checks.push({ name: key, status: 'PASS', detail: 'Configured' });
      console.log(chalk.green(`   ✓ ${key} configured`));
    }
  }

  if (!envConfigured) {
    console.log(chalk.yellow('\n   → Follow QUICKBOOKS_TESTING_GUIDE.md Step 1 to get credentials'));
    console.log(chalk.yellow('   → Update .env file with your QuickBooks app credentials'));
    return false;
  }

  // 3. Test authentication
  console.log(chalk.yellow('\n3. Testing authentication...'));
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'Admin123!@#'
    });
    
    if (loginResponse.data && loginResponse.data.accessToken) {
      checks.push({ name: 'Authentication', status: 'PASS', detail: 'JWT token obtained' });
      console.log(chalk.green('   ✓ Authentication working'));
      
      const token = loginResponse.data.accessToken;

      // 4. Test QuickBooks endpoints
      console.log(chalk.yellow('\n4. Testing QuickBooks endpoints...'));
      
      // Test status endpoint
      try {
        const statusResponse = await axios.get(`${BASE_URL}/api/quickbooks/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        checks.push({ name: 'QuickBooks Status Endpoint', status: 'PASS', detail: statusResponse.data });
        console.log(chalk.green('   ✓ Status endpoint accessible'));
        
        if (statusResponse.data.connected) {
          console.log(chalk.green('   ✓ QuickBooks already connected!'));
          console.log(chalk.gray(`     Company: ${statusResponse.data.companyName}`));
        } else {
          console.log(chalk.yellow('   → QuickBooks not connected yet (expected)'));
        }
      } catch (error) {
        checks.push({ name: 'QuickBooks Status Endpoint', status: 'FAIL', detail: error.message });
        console.log(chalk.red('   ✗ Status endpoint failed'));
      }

      // Test auth-url endpoint
      try {
        const authUrlResponse = await axios.get(`${BASE_URL}/api/quickbooks/auth-url`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        checks.push({ name: 'QuickBooks Auth URL Endpoint', status: 'PASS', detail: 'URL generated' });
        console.log(chalk.green('   ✓ Auth URL endpoint working'));
        console.log(chalk.gray(`     URL: ${authUrlResponse.data.authUrl.substring(0, 60)}...`));
      } catch (error) {
        checks.push({ name: 'QuickBooks Auth URL Endpoint', status: 'FAIL', detail: error.message });
        console.log(chalk.red('   ✗ Auth URL endpoint failed'));
        console.log(chalk.red(`     Error: ${error.response?.data?.message || error.message}`));
      }

    } else {
      checks.push({ name: 'Authentication', status: 'FAIL', detail: 'No token returned' });
      console.log(chalk.red('   ✗ Authentication failed'));
      return false;
    }
  } catch (error) {
    checks.push({ name: 'Authentication', status: 'FAIL', detail: error.message });
    console.log(chalk.red('   ✗ Authentication failed'));
    console.log(chalk.red(`     Error: ${error.response?.data?.message || error.message}`));
    return false;
  }

  // Summary
  console.log(chalk.blue.bold('\n\n📊 Validation Summary'));
  console.log(chalk.gray('='.repeat(60)));
  
  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  
  console.log(chalk.green(`✓ Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`✗ Failed: ${failed}`));
  }

  console.log('\n' + chalk.gray('Detailed Results:'));
  checks.forEach(check => {
    const icon = check.status === 'PASS' ? chalk.green('✓') : chalk.red('✗');
    console.log(`${icon} ${check.name}: ${check.status}`);
  });

  if (failed === 0) {
    console.log(chalk.green.bold('\n\n✅ ALL CHECKS PASSED - Ready for QuickBooks OAuth Testing!'));
    console.log(chalk.yellow('\nNext Steps:'));
    console.log(chalk.white('1. Follow QUICKBOOKS_TESTING_GUIDE.md to create developer account'));
    console.log(chalk.white('2. Configure OAuth credentials in .env file'));
    console.log(chalk.white('3. Restart server: npm start'));
    console.log(chalk.white('4. Import QuickBooks_Integration_Tests.postman_collection.json'));
    console.log(chalk.white('5. Run "Get Authorization URL" request'));
    console.log(chalk.white('6. Open returned URL in browser to complete OAuth'));
    return true;
  } else {
    console.log(chalk.red.bold('\n\n❌ SETUP INCOMPLETE - Fix errors above before testing'));
    return false;
  }
}

// Run validation
validateSetup().catch(error => {
  console.error(chalk.red('\n❌ Validation script error:'), error.message);
  process.exit(1);
});
