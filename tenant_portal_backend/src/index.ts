
// Initialize Sentry FIRST, before any other imports
import { initializeSentry } from './sentry.config';
initializeSentry();
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import compression from 'compression';
import express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // HTTP compression
  app.use(compression());

  // Security Headers
  app.use(helmet());

  // CORS Configuration - restrict to specific origins in production
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://admin.localhost:3000',
      'http://localhost:3003',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Mock-User-Id',
      'X-Mock-Role',
    ],
    exposedHeaders: ['X-Request-ID'],
  });

  // Request size limits + raw body capture (for Stripe signature verification)
  app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res: any, buf: Buffer) => {
      if (req.originalUrl?.includes('/webhooks/stripe')) {
        req.rawBody = Buffer.from(buf);
      }
    },
  }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [
      'leasing',
      'leasing/(.*)',
      'api/leasing',
      'api/leasing/(.*)',
      'esignature',
      'esignature/(.*)',
      'api/esignature',
      'api/esignature/(.*)',
      // Webhooks are excluded to match external service expectations
      'webhooks/esignature',
      'webhooks/stripe',
    ],
  });

  // Enhanced validation with sanitization
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Global exception filter with Sentry integration
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Performance monitoring middleware (P0-005)
  // Note: PerformanceMiddleware is registered in MonitoringModule
  // and can be accessed via dependency injection in controllers

  // Swagger API Documentation — only enable in explicitly set development mode
  const enableSwagger = process.env.NODE_ENV === 'development' || process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Property Management API')
      .setDescription('Complete API for property management operations including AI-powered features')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication and authorization')
      .addTag('properties', 'Property and unit management')
      .addTag('leases', 'Lease management and tenant relations')
      .addTag('maintenance', 'Maintenance requests and work orders')
      .addTag('payments', 'Payment processing and invoicing')
      .addTag('messaging', 'Tenant-manager communication')
      .addTag('documents', 'Document management and storage')
      .addTag('inspections', 'Property inspections and reports')
      .addTag('esignature', 'Lease signing and envelope automation')
      .addTag('ai', 'AI-powered features (rent optimization, chatbot)')
      .addTag('reporting', 'Analytics and reporting')
      .addTag('health', 'System health and monitoring')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log('API Documentation available at http://localhost:3001/api/docs');
  }

  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  logger.log('Security: Helmet headers enabled');
  logger.log(`CORS: Configured for origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  logger.log('Monitoring: Sentry error tracking initialized');
  logger.log('Performance: Performance monitoring middleware active');
  const schedulerDisabled = process.env.DISABLE_WORKFLOW_SCHEDULER === 'true';
  logger.log(
    schedulerDisabled
      ? 'Jobs: Workflow scheduler disabled (DISABLE_WORKFLOW_SCHEDULER=true)'
      : 'Jobs: Scheduled background jobs active',
  );
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
