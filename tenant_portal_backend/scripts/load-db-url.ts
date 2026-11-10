import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../.env') });

/** Host-side seeds cannot resolve Docker hostname `postgres`. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Use the repo root .env or tenant_portal_backend/.env');
  }
  if (process.env.IN_DOCKER === 'true') return url;
  return url.replace('@postgres:', '@127.0.0.1:');
}
