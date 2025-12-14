
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            envVars[key] = value;
        }
    });

    const requiredKeys = [
        'ESIGN_PROVIDER_BASE_URL',
        'ESIGN_PROVIDER_ACCOUNT_ID',
        'ESIGN_PROVIDER_CLIENT_ID',
        'ESIGN_PROVIDER_USER_ID',
        'ESIGN_PROVIDER_PRIVATE_KEY',
        'ESIGN_PROVIDER_API_KEY'
    ];

    console.log('--- Environment Variable Check ---');
    requiredKeys.forEach(key => {
        const value = envVars[key];
        if (value && value.length > 0) {
            console.log(`[OK] ${key} is set (length: ${value.length})`);
        } else {
            console.log(`[MISSING] ${key} is NOT set`);
        }
    });

    // Check specific validity for base URL
    if (envVars['ESIGN_PROVIDER_BASE_URL']) {
        if (!envVars['ESIGN_PROVIDER_BASE_URL'].includes('/restapi/v2.1')) {
            console.log('[WARNING] ESIGN_PROVIDER_BASE_URL does not contain /restapi/v2.1');
        }
    }

} catch (err) {
    console.error('Error reading .env file:', err);
}
