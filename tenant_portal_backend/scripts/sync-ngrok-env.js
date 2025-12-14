
const fs = require('fs');
const path = require('path');
const http = require('http');

const envPath = path.join(__dirname, '..', '.env');

function getNgrokUrl() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    // Find the https tunnel
                    const tunnel = parsed.tunnels.find(t => t.public_url.startsWith('https'));
                    if (tunnel) {
                        resolve(tunnel.public_url);
                    } else {
                        reject('No HTTPS tunnel found in ngrok API response');
                    }
                } catch (e) {
                    reject('Failed to parse ngrok API response: ' + e.message);
                }
            });
        });

        req.on('error', (e) => {
            reject('Failed to connect to ngrok API (is ngrok running?): ' + e.message);
        });
    });
}

function updateEnv(url) {
    try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Variables to update
        const varsToUpdate = ['FRONTEND_URL', 'web_hook_url'];

        let newContent = envContent;

        // Normalize line endings
        newContent = newContent.replace(/\r\n/g, '\n');
        let lines = newContent.split('\n');

        varsToUpdate.forEach(key => {
            let found = false;
            lines = lines.map(line => {
                if (line.startsWith(`${key}=`)) {
                    found = true;
                    return `${key}=${url}`;
                }
                return line;
            });

            if (!found) {
                lines.push(`${key}=${url}`);
            }
        });

        // Write back
        fs.writeFileSync(envPath, lines.join('\n'));
        console.log(`Successfully updated .env with URL: ${url}`);
        console.log(`Updated/Added keys: ${varsToUpdate.join(', ')}`);

    } catch (err) {
        console.error('Failed to update .env:', err);
        process.exit(1);
    }
}

async function main() {
    try {
        console.log('Fetching ngrok URL...');
        const url = await getNgrokUrl();
        console.log(`Found ngrok URL: ${url}`);
        updateEnv(url);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
