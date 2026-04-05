const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
const title = process.env.A07_TITLE || `A07 Photo Request ${Date.now()}`;

async function login(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.access_token || data.accessToken;
}

(async () => {
  const token = await login('tenant', 'Tenant123!@#');

  const createRes = await fetch(`${API}/maintenance`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description: 'A-07 verification: bathroom leak with photo evidence.',
      priority: 'HIGH',
      category: 'Plumbing',
    }),
  });

  if (!createRes.ok) {
    const t = await createRes.text();
    throw new Error(`Create request failed: ${createRes.status} ${t}`);
  }

  const req = await createRes.json();

  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-07');
  fs.mkdirSync(outDir, { recursive: true });
  const imgPath = path.join(outDir, 'a07-upload.png');
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn1xwAAAABJRU5ErkJggg==';
  fs.writeFileSync(imgPath, Buffer.from(b64, 'base64'));

  const fd = new FormData();
  const blob = new Blob([fs.readFileSync(imgPath)], { type: 'image/png' });
  fd.append('files', blob, 'a07-upload.png');
  fd.append('caption', 'Leak under sink');

  const photoRes = await fetch(`${API}/maintenance/${req.id}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (!photoRes.ok) {
    const t = await photoRes.text();
    throw new Error(`Upload photo failed: ${photoRes.status} ${t}`);
  }

  const photos = await photoRes.json();
  console.log(JSON.stringify({ title, requestId: req.id, photoCount: Array.isArray(photos) ? photos.length : 0 }, null, 2));
})();
