
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env');

try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    console.log(`Total lines: ${lines.length}`);

    const keysToFind = ['ESIGN_PROVIDER_USER_ID', 'ESIGN_PROVIDER_PRIVATE_KEY'];
    const foundKeys: Record<string, boolean> = {};

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || trimmed === '') return;

        const parts = trimmed.split('=');
        const key = parts[0].trim();

        if (keysToFind.includes(key)) {
            foundKeys[key] = true;
            console.log(`FOUND line ${index + 1}: ${key}=${parts.length > 1 ? '(SET)' : '(EMPTY)'}`);
        }
    });

    keysToFind.forEach(key => {
        if (!foundKeys[key]) {
            console.log(`MISSING: ${key}`);
        }
    });

} catch (err: any) {
    console.error(`Error reading .env: ${err.message}`);
}
