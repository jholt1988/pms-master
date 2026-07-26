
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TenantThrottlerGuard } from './middleware/tenant-throttler.guard';
import { GlobalJwtAuthGuard } from './auth/global-jwt-auth.guard';
import { OrgContextGuard } from './common/org-context/org-context.guard';
import { winstonConfig } from './config/winston.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { LeaseModule } from './lease/lease.module';
import { RentalApplicationModule } from './rental-application/rental-application.module';
import { ScreeningModule } from './screening/screening.module';
import { PropertyModule } from './property/property.module';
import { ExpenseModule } from './expense/expense.module';
import { RentEstimatorModule } from './rent-estimator/rent-estimator.module';
import { PaymentsModule } from './payments/payments.module';
import { BillingModule } from './billing/billing.module';
import { SettingsModule } from './settings/settings.module';
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
import { FeedModule } from './feed/feed.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { SentryModule } from '@sentry/nestjs/setup'
import { FoundationModule } from './foundation/foundation.module';
import { SuccessEnvelopeInterceptor } from './common/envelope/success-envelope.interceptor';
import { DecisionsModule } from './decisions/decisions.module';
import { CommandCenterModule } from './command-center/command-center.module';
import { OperatorWorkflowsModule } from './operator-workflows/operator-workflows.module';
import { OperatorPaymentsModule } from './operator-payments/operator-payments.module';
import { OperatorSetupModule } from './operator-setup/operator-setup.module';
import { OperatorApplicationsModule } from './operator-applications/operator-applications.module';
import { OperatorLeaseSigningModule } from './operator-lease-signing/operator-lease-signing.module';
import { OperatorMaintenanceDispatchModule } from './operator-maintenance-dispatch/operator-maintenance-dispatch.module';
import { OperatorInspectionEstimatesModule } from './operator-inspection-estimates/operator-inspection-estimates.module';
import { OperatorRenewalsModule } from './operator-renewals/operator-renewals.module';
import { OperatorOwnerStatementsModule } from './operator-owner-statements/operator-owner-statements.module';
import { OperatorDocumentsModule } from './operator-documents/operator-documents.module';
import { OperatorMessagingModule } from './operator-messaging/operator-messaging.module';
import { OperatorCapexModule } from './operator-capex/operator-capex.module';
import { OperatorSecurityModule } from './operator-security/operator-security.module';
import { OperatorQuickBooksModule } from './operator-quickbooks/operator-quickbooks.module';
import { OperatorSmartDevicesModule } from './operator-smart-devices/operator-smart-devices.module';
import { OperatorEsignaturesModule } from './operator-esignatures/operator-esignatures.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { OperatorVendorsModule } from './operator-vendors/operator-vendors.module';
import { OperatorTenantInsuranceModule } from './operator-tenant-insurance/operator-tenant-insurance.module';
import { OperatorUtilityBillingModule } from './operator-utility-billing/operator-utility-billing.module';
import { OperatorLeaseAbstractionModule } from './operator-lease-abstraction/operator-lease-abstraction.module';
import { OperatorChatbotModule } from './operator-chatbot/operator-chatbot.module';
import { OperatorAuditLogModule } from './operator-audit-log/operator-audit-log.module';

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
    SentryModule.forRoot(),
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
    ScreeningModule,
    PropertyModule,
    ExpenseModule,
    RentEstimatorModule,
    BillingModule,
    SettingsModule,
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
    FeedModule,
    AnalyticsModule,
    FeatureFlagsModule,
    CircuitBreakerModule,
    TelemetryModule,
    FoundationModule,
    DecisionsModule,
    CommandCenterModule,
    OperatorWorkflowsModule,
    OperatorPaymentsModule,
    OperatorSetupModule,
    OperatorApplicationsModule,
    OperatorLeaseSigningModule,
    OperatorMaintenanceDispatchModule,
    OperatorInspectionEstimatesModule,
    OperatorRenewalsModule,
    OperatorOwnerStatementsModule,
    OperatorDocumentsModule,
    OperatorMessagingModule,
    OperatorCapexModule,
    OperatorVendorsModule,
    OperatorSecurityModule,
    OperatorQuickBooksModule,
    OperatorSmartDevicesModule,
    OperatorEsignaturesModule,
    OperatorTenantInsuranceModule,
    OperatorUtilityBillingModule,
    OperatorLeaseAbstractionModule,
    OperatorChatbotModule,
    OperatorAuditLogModule,
    AiGatewayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard (disabled in test environment)
    ...rateLimitProviders,
    // Global JWT auth guard: every route requires a valid JWT unless the
    // handler/controller is annotated with @Public(). Additive to the
    // ThrottlerGuard APP_GUARD above; RolesGuard usage is unchanged.
    {
      provide: APP_GUARD,
      useClass: GlobalJwtAuthGuard,
    },
    // Global org-context guard. Registered AFTER GlobalJwtAuthGuard so that
    // req.user is populated before it runs. It attaches req.org for
    // authenticated non-tenant users and enforces single-org membership.
    // @Public() routes and @SkipOrgContext() handlers are exempt (checked
    // inside the guard); unauthenticated requests and TENANT users pass through
    // without an org context.
    {
      provide: APP_GUARD,
      useClass: OrgContextGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessEnvelopeInterceptor,
    },
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
