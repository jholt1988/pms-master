/**
 * Check what's actually in the .env file
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env');

try {
  const content = readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log('\n📄 .env file contents for ESIGN_PROVIDER_BASE_URL:\n');
  
  lines.forEach((line, index) => {
    if (line.includes('ESIGN_PROVIDER_BASE_URL')) {
      console.log(`Line ${index + 1}: ${line}`);
      console.log(`  Raw length: ${line.length}`);
      console.log(`  Has quotes: ${line.includes("'") || line.includes('"')}`);
      
      const match = line.match(/ESIGN_PROVIDER_BASE_URL\s*=\s*(.+)/);
      if (match) {
        const value = match[1].trim();
        console.log(`  Extracted value: "${value}"`);
        console.log(`  Value length: ${value.length}`);
        console.log(`  Has /v2.1: ${value.includes('/v2.1')}`);
        console.log(`  Ends with /v2.1: ${value.endsWith('/v2.1')}`);
      }
      console.log('');
    }
  });
  
  // Also check for any other ESIGN variables
  console.log('\n📋 All ESIGN-related variables:\n');
  lines.forEach((line) => {
    if (line.toUpperCase().includes('ESIGN')) {
      console.log(`  ${line}`);
    }
  });
  
} catch (error) {
  console.error(`Error reading .env file: ${error}`);
}

