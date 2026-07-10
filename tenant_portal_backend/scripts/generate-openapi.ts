import 'reflect-metadata';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { GLOBAL_API_PREFIX, GLOBAL_PREFIX_EXCLUDE } from '../src/config/global-prefix';

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.DISABLE_REDIS = process.env.DISABLE_REDIS || 'true';
  process.env.DISABLE_WORKFLOW_SCHEDULER = process.env.DISABLE_WORKFLOW_SCHEDULER || 'true';
  process.env.ENABLE_LEGACY_ROUTES = process.env.ENABLE_LEGACY_ROUTES || 'false';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(GLOBAL_API_PREFIX, {
    // Use the SAME exclude list as the runtime bootstrap so the generated
    // schema matches the routes the server actually serves.
    exclude: GLOBAL_PREFIX_EXCLUDE,
  });

  const config = new DocumentBuilder()
    .setTitle('Property Management API')
    .setDescription('Canonical API surface for the PropertyOS operator app.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth')
    .addTag('properties')
    .addTag('leases')
    .addTag('rental-applications')
    .addTag('payments')
    .addTag('bookkeeping')
    .addTag('maintenance')
    .addTag('inspections')
    .addTag('documents')
    .addTag('messaging')
    .addTag('reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = resolve(process.cwd(), '..', 'docs', 'api', 'openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();

  console.log(`OpenAPI written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
