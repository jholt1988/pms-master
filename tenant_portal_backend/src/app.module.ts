
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';
import { TenantThrottlerGuard } from './middleware/tenant-throttler.guard';
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
import { LeasingModule } from './leasing/leasing.module';
import { PropertyOsModule } from './property-os/property-os.module'; // Added for Property OS integration
import { MilModule } from './mil/mil.module';
import { LegacyPathMiddleware } from './middleware/legacy-path.middleware';
import { PerformanceMiddleware } from './monitoring/performance.middleware';
import { CorrelationMiddleware } from './middleware/request-context/correlation.middleware';
import { DevMockAuthMiddleware } from './middleware/dev-mock-auth.middleware';
import { EventsModule } from './events/events.module'; // ADDED
import { Web3Module } from './web3/web3.module';
import { PrivacyModule } from './privacy/privacy.module';
import { PolicyModule } from './policy/policy.module';
import { MetricsModule } from './metrics/metrics.module';
import { AppCacheModule } from './cache/cache.module';
import { BriefingModule } from './briefing/briefing.module';
import { BookkeepingModule } from './bookkeeping/bookkeeping.module';
import { validateEnv } from './config/env/env.validation';
import { VendorsModule } from './vendors/vendors.module';
import { TenantInsuranceModule } from './tenant-insurance/tenant-insurance.module';
import { OwnerPortalModule } from './owner-portal/owner-portal.module';
import { UtilityBillingModule } from './utility-billing/utility-billing.module';
import { OmnichannelModule } from './omnichannel/omnichannel.module';
import { SmartDevicesModule } from './smart-devices/smart-devices.module';
import { MoveOrchestrationModule } from './move-orchestration/move-orchestration.module';
import { ContractorBiddingModule } from './contractor-bidding/contractor-bidding.module';
import { CapexForecastingModule } from './capex-forecasting/capex-forecasting.module';
import { LeaseAbstractionModule } from './lease-abstraction/lease-abstraction.module';
import { TenantModule } from './tenant/tenant.module';
import { AuditLogModule } from './shared/audit-log.module';


const rateLimitEnabled =
  process.env.NODE_ENV !== 'test' && process.env.RATE_LIMIT_ENABLED !== 'false';

const throttlerConfigs = rateLimitEnabled
  ? [
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
    ]
  : [
      {
        name: 'disabled',
        ttl: 60000,
        limit: Number.MAX_SAFE_INTEGER, // effectively disable throttling in tests
      },
    ];

const rateLimitProviders = rateLimitEnabled
  ? [
      {
        provide: APP_GUARD,
        useClass: TenantThrottlerGuard,
      },
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Winston logging
    WinstonModule.forRoot(winstonConfig),
    // Rate limiting configuration
    ThrottlerModule.forRoot(throttlerConfigs),
    EventsModule, // ADDED
    PolicyModule,
    PrismaModule,
    AuditLogModule,
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
    HealthModule,
    JobsModule,
    QuickBooksModule,
    ListingSyndicationModule,
    EsignatureModule,
    DashboardModule,
    RentOptimizationModule,
    MonitoringModule,
    WorkflowsModule,
    ChatbotModule,
    LeasingModule,
    PropertyOsModule, // Added for Property OS integration
    MilModule,
    Web3Module,
    PrivacyModule,
    MetricsModule,
    AppCacheModule,
    BriefingModule,
    BookkeepingModule,
    VendorsModule,
    TenantInsuranceModule,
    OwnerPortalModule,
    UtilityBillingModule,
    OmnichannelModule,
    SmartDevicesModule,
    MoveOrchestrationModule,
    ContractorBiddingModule,
    CapexForecastingModule,
    LeaseAbstractionModule,
    TenantModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard (disabled in test environment)
    ...rateLimitProviders,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // DevMockAuthMiddleware must run first so the JWT guard sees the injected token
    consumer
      .apply(DevMockAuthMiddleware)
      .forRoutes('*');

    consumer
      .apply(CorrelationMiddleware)
      .forRoutes('*');

    consumer
      .apply(LegacyPathMiddleware)
      .forRoutes('*');

    consumer
      .apply(PerformanceMiddleware)
      .forRoutes('*');
  }
}
