import 'reflect-metadata';
// Initialize Sentry FIRST, before any other imports
import { initializeSentry } from './sentry.config';
initializeSentry();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security Headers
  app.use(helmet());
  
  // CORS Configuration - restrict to specific origins in production
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Request size limits
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ limit: '1mb', extended: true }));
  
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
  
  // Swagger API Documentation
  if (process.env.NODE_ENV !== 'production') {
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

    console.log(`📚 API Documentation: Available at http://localhost:3001/api/docs`);
  }
  
  await app.listen(3001);
  console.log(`🔒 Security: Helmet headers enabled`);
  console.log(`🌐 CORS: Configured for origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  console.log(`📊 Monitoring: Sentry error tracking initialized`);
  console.log(`⏰ Jobs: Scheduled background jobs active`);
  console.log(`🚀 Application is running on: http://localhost:3001`);
}
bootstrap();
