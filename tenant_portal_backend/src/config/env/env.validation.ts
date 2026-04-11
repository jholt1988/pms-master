import { z } from 'zod';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database (required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT (required)
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRATION: z.string().default('24h'),

  // Redis (optional, defaults for local dev)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // AI Services (optional)
  OPENAI_API_KEY: z.string().optional(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),

  // External services (optional)
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  WORKFLOW_ENGINE_URL: z.string().default('http://localhost:3003'),
  MIL_WRAPPER_ENABLED: z.string().default('false'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    logger.error(`Environment validation failed:\n${errors}`);
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  if (result.data.NODE_ENV === 'production') {
    const warnings: string[] = [];
    if (!result.data.SENTRY_DSN) warnings.push('SENTRY_DSN not set - error tracking disabled');
    if (!result.data.STRIPE_SECRET_KEY) warnings.push('STRIPE_SECRET_KEY not set - payments disabled');
    if (!result.data.OPENAI_API_KEY) warnings.push('OPENAI_API_KEY not set - AI features disabled');
    if (result.data.JWT_SECRET.length < 32) warnings.push('JWT_SECRET should be at least 32 characters in production');

    warnings.forEach((w) => logger.warn(w));
  }

  return result.data;
}
