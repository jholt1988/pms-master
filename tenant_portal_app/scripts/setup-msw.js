#!/usr/bin/env node

/**
 * MSW Setup Script
 * Initializes MSW service worker for browser mocking
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up MSW (Mock Service Worker)...\n');

try {
  // Check if public directory exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('✅ Created public directory');
  }

  // Initialize MSW
  console.log('📦 Initializing MSW service worker...');
  execSync('npx msw init public/ --save', { stdio: 'inherit' });
  
  console.log('\n✅ MSW setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Start your dev server: npm start');
  console.log('   2. MSW will automatically intercept API calls');
  console.log('   3. To disable MSW, set VITE_USE_MSW=false in .env');
  console.log('\n📚 See MSW_SETUP.md for more information\n');
} catch (error) {
  console.error('❌ Failed to setup MSW:', error.message);
  console.log('\n💡 Try running manually: npx msw init public/ --save\n');
  process.exit(1);
}

