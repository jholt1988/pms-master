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

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('redis'),
  REDIS_PORT: z.coerce.number().default(6379),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // AI Services
  AI_ENABLED: z.coerce.boolean().default(false),
  AI_CHATBOT_ENABLED: z.coerce.boolean().default(false),
  AI_PROPERTY_OPS_ORCHESTRATOR_ENABLED: z.coerce.boolean().default(false),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(4000),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().optional(),

  // eSignature
  ESIGN_PROVIDER: z.string().optional(),
  ESIGN_STRICT_MODE: z.coerce.boolean().default(true),
  ESIGN_PROVIDER_BASE_URL: z.string().optional(),
  ESIGN_PROVIDER_API_KEY: z.string().optional(),
  ESIGN_PROVIDER_CLIENT_ID: z.string().optional(),
  ESIGN_PROVIDER_ACCOUNT_ID: z.string().optional(),
  ESIGN_PROVIDER_PRIVATE_KEY: z.string().optional(),

  // QuickBooks
  QUICKBOOKS_CLIENT_ID: z.string().optional(),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional(),
  QUICKBOOKS_REDIRECT_URI: z.string().optional(),
  QUICKBOOKS_ENVIRONMENT: z.string().default('sandbox'),

  // External services
  ML_SERVICE_URL: z.string().default('http://ml-service:8000'),
  WORKFLOW_ENGINE_URL: z.string().default('http://workflow-engine:3003'),
  MIL_SERVICE_URL: z.string().default('http://mil:3010'),
  MIL_WRAPPER_ENABLED: z.coerce.boolean().default(false),

  // Estimate Service
  ESTIMATE_DEFAULT_CURRENCY: z.string().default('USD'),
  ESTIMATE_ENABLE_CACHING: z.coerce.boolean().default(true),
  ESTIMATE_CACHE_TTL_HOURS: z.coerce.number().default(24),

  // Admin Bootstrap
  ADMIN_BOOTSTRAP_ENABLED: z.coerce.boolean().default(false),
  ADMIN_BOOTSTRAP_USERNAME: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),
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
