
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';
import { winstonConfig } from './config/winston.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { LeaseModule } from './lease/lease.module';
import { RentalApplicationModule } from './rental-application/rental-application.module';
import { PropertyModule } from './property/property.module';
import { ExpenseModule } from './expense/expense.module';
import { RentEstimatorModule } from './rent-estimator/rent-estimator.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingModule } from './billing/billing.module';
import { SecurityEventsModule } from './security-events/security-events.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportingModule } from './reporting/reporting.module';
import { InspectionsModule } from './inspections/inspections.module';
import { EventScheduleModule } from './schedule/schedule.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { QuickBooksModule } from './quickbooks/quickbooks.module';
import { ListingSyndicationModule } from './listing-syndication/listing-syndication.module';
import { EsignatureModule } from './esignature/esignature.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RentOptimizationModule } from './rent-optimization/rent-optimization.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { LegacyPathMiddleware } from './middleware/legacy-path.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'], // Support .env.local for local overrides
    }),
    ScheduleModule.forRoot(),
    // Winston logging
    WinstonModule.forRoot(winstonConfig),
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // limit each IP to 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds  
        limit: 20, // limit each IP to 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // limit each IP to 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    MaintenanceModule,
    PaymentsModule,
    MessagingModule,
    LeaseModule,
    RentalApplicationModule,
    PropertyModule,
    ExpenseModule,
    RentEstimatorModule,
    BillingModule,
    SecurityEventsModule,
    EmailModule,
    NotificationsModule,
    DocumentsModule,
    ReportingModule,
    InspectionsModule,
    EventScheduleModule,
    // HealthModule, // Temporarily disabled due to TypeORM dependency conflict
    JobsModule,
    QuickBooksModule,
    ListingSyndicationModule,
    EsignatureModule,
    DashboardModule,
    RentOptimizationModule,
    MonitoringModule,
    WorkflowsModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LegacyPathMiddleware).forRoutes('*');
  }
}
