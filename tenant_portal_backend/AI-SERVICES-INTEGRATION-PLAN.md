# Backend AI Services Integration Plan

**Date:** January 2025  
**Status:** Implementation Plan  
**Scope:** Integration of 5 backend AI services into existing workflows

---

## 📋 Executive Summary

This plan outlines the step-by-step integration of 5 backend AI services into the Property Management Suite:

1. **AI Maintenance Service** - Priority assignment, technician matching, SLA breach prediction
2. **AI Payment Service** - Risk assessment, smart reminders, payment plan suggestions
3. **AI Lease Renewal Service** - Renewal prediction, rent adjustment, personalized offers
4. **AI Notification Service** - Optimal timing, content personalization, channel selection
5. **AI Anomaly Detection Service** - Payment/maintenance/system anomaly detection

**Current Status:**
- ✅ All 5 AI services exist and are registered in modules
- ✅ MaintenanceService has partial integration (priority assignment)
- ⚠️ Other services not yet integrated
- ⚠️ Workflow engine has placeholder steps
- ⚠️ No scheduled jobs using AI services

---

## 🎯 Integration Goals

### Primary Goals
1. **Seamless Integration** - AI services work transparently with existing services
2. **Graceful Degradation** - System works even if AI services fail
3. **Performance** - AI calls don't block critical operations
4. **Observability** - Full logging and monitoring of AI operations
5. **Cost Control** - Rate limiting and caching to control API costs

### Success Metrics
- ✅ All AI services integrated and functional
- ✅ 95%+ uptime for AI-enhanced workflows
- ✅ <500ms average AI response time (with caching)
- ✅ <1% error rate for AI operations
- ✅ Cost per request <$0.01 (OpenAI API)

---

## 📊 Current Architecture

### Service Dependencies

```
MaintenanceService
    └─> AIMaintenanceService (partial integration)
    
PaymentsService
    └─> AIPaymentService (not integrated)
    
LeaseService
    └─> AILeaseRenewalService (not integrated)
    
NotificationsService
    └─> AINotificationService (not integrated)
    
MonitoringModule
    └─> AIAnomalyDetectorService (not integrated)
```

### Workflow Engine Integration Points

```typescript
// Current placeholder steps in workflow-engine.service.ts:
- 'assign-priority' (CUSTOM) - Should use AIMaintenanceService
- 'check-renewal-likelihood' (CUSTOM) - Should use AILeaseRenewalService
- 'generate-offer' (CUSTOM) - Should use AILeaseRenewalService
```

---

## 🔧 Phase 1: AI Maintenance Service Integration

### 1.1 Complete Priority Assignment Integration

**Current State:**
- ✅ `MaintenanceService.create()` already calls `AIMaintenanceService.assignPriorityWithAI()`
- ⚠️ AI service is optional (injected with `?`)
- ⚠️ No error handling for AI failures

**Tasks:**

1. **Update MaintenanceService** (`src/maintenance/maintenance.service.ts`)
   ```typescript
   // Make AI service required (remove optional)
   constructor(
     private readonly prisma: PrismaService,
     private readonly aiMaintenanceService: AIMaintenanceService, // Remove ?
   ) {}
   
   // Add retry logic and better error handling
   async create(userId: number, dto: CreateMaintenanceRequestDto) {
     let priority = dto.priority;
     if (!priority) {
       try {
         priority = await this.aiMaintenanceService.assignPriorityWithAI(
           dto.title,
           dto.description,
         );
       } catch (error) {
         this.logger.warn('AI priority assignment failed, using fallback', error);
         priority = this.fallbackPriorityAssignment(dto.title, dto.description);
       }
     }
     // ... rest of method
   }
   ```

2. **Add Fallback Priority Logic**
   ```typescript
   private fallbackPriorityAssignment(title: string, description: string): MaintenancePriority {
     const text = `${title} ${description}`.toLowerCase();
     if (text.match(/\b(leak|flood|fire|gas|electrical|security|lock|break-in)\b/)) {
       return MaintenancePriority.HIGH;
     }
     if (text.match(/\b(heat|ac|hvac|water|plumbing|appliance)\b/)) {
       return MaintenancePriority.MEDIUM;
     }
     return MaintenancePriority.LOW;
   }
   ```

3. **Add Logging and Metrics**
   ```typescript
   // Log AI decisions
   this.logger.log(`AI assigned priority: ${priority} for request: ${dto.title}`);
   
   // Track metrics
   // - AI priority assignment success rate
   // - Average AI response time
   // - Fallback usage rate
   ```

**Files to Modify:**
- `src/maintenance/maintenance.service.ts`
- `src/maintenance/maintenance.module.ts` (ensure AIMaintenanceService is required)

**Testing:**
- Unit tests for priority assignment with AI
- Integration tests for fallback behavior
- Test with OpenAI API key and without

---

### 1.2 Integrate Technician Assignment

**Current State:**
- ⚠️ `AIMaintenanceService.assignTechnician()` exists but not used
- ⚠️ `MaintenanceService.assignTechnician()` uses manual assignment

**Tasks:**

1. **Update MaintenanceService.assignTechnician()**
   ```typescript
   async assignTechnician(
     requestId: number,
     dto: AssignTechnicianDto,
   ): Promise<MaintenanceRequest> {
     // If technician not provided, use AI to assign
     if (!dto.technicianId) {
       try {
         const aiAssignment = await this.aiMaintenanceService.assignTechnician(requestId);
         dto.technicianId = aiAssignment.technician.id;
         this.logger.log(`AI assigned technician: ${aiAssignment.technician.id} for request: ${requestId}`);
       } catch (error) {
         this.logger.warn('AI technician assignment failed', error);
         // Fallback to manual assignment or throw error
         throw new BadRequestException('Technician assignment required');
       }
     }
     
     // Continue with existing assignment logic
     // ...
   }
   ```

2. **Update Workflow Engine**
   ```typescript
   // In workflow-engine.service.ts, update 'ASSIGN_TECHNICIAN' step
   private async executeAssignTechnician(
     step: WorkflowStep,
     execution: WorkflowExecution,
     userId?: number,
   ): Promise<any> {
     const requestId = step.input?.requestId || execution.output?.maintenanceRequestId;
     
     // Use AI to assign technician
     const aiMaintenanceService = this.getService<AIMaintenanceService>(AIMaintenanceService);
     const assignment = await aiMaintenanceService.assignTechnician(requestId);
     
     return {
       technicianId: assignment.technician.id,
       technicianName: assignment.technician.name,
       matchScore: assignment.score,
       reasons: assignment.reasons,
     };
   }
   ```

**Files to Modify:**
- `src/maintenance/maintenance.service.ts`
- `src/workflows/workflow-engine.service.ts`
- `src/maintenance/maintenance.controller.ts` (update DTO to make technicianId optional)

**Testing:**
- Test AI technician assignment
- Test fallback when no suitable technician found
- Test with various request types and priorities

---

### 1.3 Integrate SLA Breach Prediction

**Current State:**
- ⚠️ `AIMaintenanceService.predictSLABreach()` exists but not used
- ⚠️ No scheduled monitoring for SLA breaches

**Tasks:**

1. **Add Scheduled SLA Monitoring**
   ```typescript
   // In scheduled-jobs.service.ts or new maintenance-monitoring.service.ts
   @Cron(CronExpression.EVERY_HOUR)
   async monitorMaintenanceSLAs() {
     const pendingRequests = await this.maintenanceService.findAll({
       status: Status.PENDING,
       priority: MaintenancePriority.HIGH,
     });
     
     for (const request of pendingRequests) {
       try {
         const prediction = await this.aiMaintenanceService.predictSLABreach(request.id);
         
         if (prediction.riskLevel === 'HIGH' || prediction.riskLevel === 'CRITICAL') {
           // Auto-escalate
           await this.maintenanceService.escalate(request.id, {
             reason: `AI predicted SLA breach (${prediction.probability * 100}% probability)`,
             factors: prediction.factors,
           });
           
           // Notify manager
           await this.notificationsService.create({
             userId: request.property?.managerId,
             type: NotificationType.MAINTENANCE_URGENT,
             title: 'SLA Breach Risk Detected',
             message: `Request #${request.id} has ${prediction.probability * 100}% risk of SLA breach`,
           });
         }
       } catch (error) {
         this.logger.error(`Error predicting SLA breach for request ${request.id}`, error);
       }
     }
   }
   ```

2. **Add Escalation Method to MaintenanceService**
   ```typescript
   async escalate(requestId: number, reason: { reason: string; factors: string[] }) {
     // Update priority to HIGH if not already
     // Add note with escalation reason
     // Notify stakeholders
   }
   ```

**Files to Create/Modify:**
- `src/jobs/maintenance-monitoring.service.ts` (new)
- `src/maintenance/maintenance.service.ts` (add escalate method)
- `src/jobs/jobs.module.ts` (register new service)

**Testing:**
- Test SLA breach prediction
- Test auto-escalation logic
- Test notification sending

---

## 💰 Phase 2: AI Payment Service Integration

### 2.1 Integrate Payment Risk Assessment

**Current State:**
- ⚠️ `AIPaymentService.assessPaymentRisk()` exists but not used
- ⚠️ No risk-based payment processing

**Tasks:**

1. **Update Scheduled Payment Processing**
   ```typescript
   // In scheduled-jobs.service.ts
   @Cron(CronExpression.EVERY_DAY_AT_2AM)
   async processScheduledPayments() {
     const dueInvoices = await this.paymentsService.getInvoicesDueToday();
     
     for (const invoice of dueInvoices) {
       // Assess risk before processing
       const riskAssessment = await this.aiPaymentService.assessPaymentRisk(
         invoice.lease.tenantId,
         invoice.id,
       );
       
       if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
         // Don't auto-process, send reminder instead
         await this.sendPaymentReminder(invoice, riskAssessment);
         
         // Suggest payment plan if applicable
         if (riskAssessment.suggestPaymentPlan) {
           await this.createPaymentPlanOffer(invoice, riskAssessment.paymentPlanSuggestion);
         }
       } else {
         // Process payment normally
         await this.processPayment(invoice);
       }
     }
   }
   ```

2. **Add Payment Plan Creation**
   ```typescript
   // In payments.service.ts
   async createPaymentPlan(invoiceId: number, plan: PaymentPlanSuggestion) {
     // Create payment plan record
     // Update invoice status
     // Notify tenant
   }
   ```

**Files to Modify:**
- `src/jobs/scheduled-jobs.service.ts`
- `src/payments/payments.service.ts`
- `src/payments/payments.module.ts` (ensure AIPaymentService is injected)

**Testing:**
- Test risk assessment for various tenant profiles
- Test payment plan creation
- Test payment processing with risk assessment

---

### 2.2 Integrate Smart Payment Reminders

**Current State:**
- ⚠️ `AIPaymentService.getOptimalReminderTiming()` exists but not used
- ⚠️ Reminders sent at fixed times

**Tasks:**

1. **Update Payment Reminder Logic**
   ```typescript
   // In scheduled-jobs.service.ts or notifications.tasks.ts
   @Cron(CronExpression.EVERY_6_HOURS)
   async sendPaymentReminders() {
     const upcomingInvoices = await this.paymentsService.getInvoicesDueInDays(7);
     
     for (const invoice of upcomingInvoices) {
       // Get optimal reminder timing
       const timing = await this.aiPaymentService.getOptimalReminderTiming(
         invoice.lease.tenantId,
         invoice.id,
       );
       
       // Check if it's time to send
       if (this.shouldSendReminder(timing.optimalTime)) {
         await this.notificationsService.create({
           userId: invoice.lease.tenantId,
           type: NotificationType.PAYMENT_DUE,
           title: timing.personalizedMessage || `Payment Due: $${invoice.amount}`,
           message: timing.personalizedMessage || `Your payment of $${invoice.amount} is due on ${invoice.dueDate}`,
           sendEmail: timing.channel === 'EMAIL',
         });
         
         // Send SMS if channel is SMS
         if (timing.channel === 'SMS') {
           await this.smsService.sendPaymentReminder(invoice);
         }
       }
     }
   }
   ```

**Files to Modify:**
- `src/jobs/scheduled-jobs.service.ts`
- `src/notifications/notifications.tasks.ts`

**Testing:**
- Test optimal timing calculation
- Test multi-channel delivery
- Test personalization

---

## 📄 Phase 3: AI Lease Renewal Service Integration

### 3.1 Integrate Renewal Likelihood Prediction

**Current State:**
- ⚠️ `AILeaseRenewalService.predictRenewalLikelihood()` exists but not used
- ⚠️ `lease.tasks.ts` has renewal checks but no AI

**Tasks:**

1. **Update Lease Renewal Check Task**
   ```typescript
   // In lease.tasks.ts
   @Cron(CronExpression.EVERY_DAY_AT_8AM)
   async checkLeaseRenewals() {
     const expiringLeases = await this.leaseService.getLeasesExpiringInDays(90);
     
     for (const lease of expiringLeases) {
       // Predict renewal likelihood
       const prediction = await this.aiLeaseRenewalService.predictRenewalLikelihood(lease.id);
       
       // Only send offers if likelihood is reasonable
       if (prediction.renewalProbability > 0.3) {
         // Generate personalized offer
         const offer = await this.aiLeaseRenewalService.generatePersonalizedOffer(lease.id);
         
         // Create renewal offer
         await this.leaseService.createRenewalOffer({
           leaseId: lease.id,
           newRentAmount: offer.baseRent,
           incentives: offer.incentives,
           expirationDate: offer.expirationDate,
         });
         
         // Send offer to tenant
         await this.emailService.sendRenewalOffer(lease.tenant, offer);
       } else {
         // Low likelihood - prepare for vacancy
         await this.prepareForVacancy(lease);
       }
     }
   }
   ```

2. **Add Prepare for Vacancy Method**
   ```typescript
   // In lease.service.ts
   private async prepareForVacancy(lease: Lease) {
     // Mark unit as potentially available
     // Start marketing
     // Schedule move-out inspection
   }
   ```

**Files to Modify:**
- `src/lease/lease.tasks.ts`
- `src/lease/lease.service.ts`
- `src/lease/lease.module.ts` (ensure AILeaseRenewalService is injected)

**Testing:**
- Test renewal prediction for various lease scenarios
- Test offer generation
- Test vacancy preparation

---

### 3.2 Integrate Rent Adjustment Recommendations

**Current State:**
- ⚠️ `AILeaseRenewalService.getOptimalRentAdjustment()` exists but not used
- ⚠️ Rent adjustments are manual

**Tasks:**

1. **Update Renewal Offer Creation**
   ```typescript
   // In lease.service.ts
   async createRenewalOffer(dto: CreateRenewalOfferDto) {
     // Get optimal rent adjustment
     const adjustment = await this.aiLeaseRenewalService.getOptimalRentAdjustment(
       dto.leaseId,
     );
     
     // Use AI recommendation if not provided
     const newRent = dto.newRentAmount || adjustment.recommendedRent;
     
     // Create offer with AI reasoning
     const offer = await this.prisma.leaseRenewalOffer.create({
       data: {
         leaseId: dto.leaseId,
         newRentAmount: newRent,
         reasoning: adjustment.reasoning,
         factors: adjustment.factors,
         // ... other fields
       },
     });
     
     return offer;
   }
   ```

2. **Update Workflow Engine**
   ```typescript
   // In workflow-engine.service.ts, update 'check-renewal-likelihood' step
   private async executeCheckRenewalLikelihood(
     step: WorkflowStep,
     execution: WorkflowExecution,
     userId?: number,
   ): Promise<any> {
     const leaseId = step.input?.leaseId || execution.input?.leaseId;
     const aiLeaseRenewalService = this.getService<AILeaseRenewalService>(AILeaseRenewalService);
     
     const prediction = await aiLeaseRenewalService.predictRenewalLikelihood(leaseId);
     const adjustment = await aiLeaseRenewalService.getOptimalRentAdjustment(leaseId);
     
     return {
       renewalProbability: prediction.renewalProbability,
       confidence: prediction.confidence,
       recommendedRent: adjustment.recommendedRent,
       adjustmentPercentage: adjustment.adjustmentPercentage,
     };
   }
   ```

**Files to Modify:**
- `src/lease/lease.service.ts`
- `src/workflows/workflow-engine.service.ts`

**Testing:**
- Test rent adjustment recommendations
- Test integration with renewal workflow
- Test reasoning and factor display

---

## 🔔 Phase 4: AI Notification Service Integration

### 4.1 Integrate Optimal Timing

**Current State:**
- ⚠️ `AINotificationService.getOptimalTiming()` exists but not used
- ⚠️ Notifications sent immediately

**Tasks:**

1. **Update NotificationService.create()**
   ```typescript
   // In notifications.service.ts
   async create(data: {
     userId: number;
     type: NotificationType;
     title: string;
     message: string;
     metadata?: any;
     sendEmail?: boolean;
     useAITiming?: boolean; // New flag
   }) {
     let sendAt = new Date();
     
     // Get optimal timing if enabled
     if (data.useAITiming) {
       try {
         const timing = await this.aiNotificationService.getOptimalTiming(
           data.userId,
           data.type,
         );
         sendAt = timing.optimalTime;
       } catch (error) {
         this.logger.warn('AI timing calculation failed, using immediate send', error);
       }
     }
     
     // Create notification
     const notification = await this.prisma.notification.create({
       data: {
         userId: data.userId,
         type: data.type,
         title: data.title,
         message: data.message,
         metadata: data.metadata,
         scheduledFor: sendAt > new Date() ? sendAt : null,
       },
     });
     
     // Send immediately or schedule
     if (sendAt <= new Date()) {
       await this.sendNotification(notification, data.sendEmail);
     } else {
       // Schedule for later (use queue or cron)
       await this.scheduleNotification(notification, sendAt);
     }
     
     return notification;
   }
   ```

2. **Add Notification Scheduling**
   ```typescript
   // In notifications.service.ts
   private async scheduleNotification(notification: Notification, sendAt: Date) {
     // Add to queue or scheduled jobs
     // Use Bull queue or similar
   }
   ```

**Files to Modify:**
- `src/notifications/notifications.service.ts`
- `src/notifications/notifications.module.ts` (ensure AINotificationService is injected)

**Testing:**
- Test optimal timing calculation
- Test notification scheduling
- Test immediate vs scheduled delivery

---

### 4.2 Integrate Content Personalization

**Current State:**
- ⚠️ `AINotificationService.personalizeContent()` exists but not used
- ⚠️ Notifications use static templates

**Tasks:**

1. **Update Notification Creation**
   ```typescript
   // In notifications.service.ts
   async create(data: {
     userId: number;
     type: NotificationType;
     title: string;
     message: string;
     metadata?: any;
     personalize?: boolean; // New flag
   }) {
     let title = data.title;
     let message = data.message;
     
     // Personalize content if enabled
     if (data.personalize) {
       try {
         const personalized = await this.aiNotificationService.personalizeContent(
           data.userId,
           data.type,
           { title, message },
         );
         title = personalized.title;
         message = personalized.message;
       } catch (error) {
         this.logger.warn('AI personalization failed, using original content', error);
       }
     }
     
     // Create notification with personalized content
     // ...
   }
   ```

**Files to Modify:**
- `src/notifications/notifications.service.ts`

**Testing:**
- Test content personalization
- Test fallback to original content
- Test various notification types

---

### 4.3 Integrate Channel Selection

**Current State:**
- ⚠️ `AINotificationService.selectOptimalChannel()` exists but not used
- ⚠️ Channel selection is manual

**Tasks:**

1. **Update Notification Sending**
   ```typescript
   // In notifications.service.ts
   private async sendNotification(notification: Notification, sendEmail?: boolean) {
     // Get optimal channel
     const channel = await this.aiNotificationService.selectOptimalChannel(
       notification.userId,
       notification.type,
     );
     
     // Send via selected channel
     switch (channel) {
       case 'EMAIL':
         await this.emailService.sendNotificationEmail(...);
         break;
       case 'SMS':
         await this.smsService.send(...);
         break;
       case 'PUSH':
         await this.sendPushNotification(...);
         break;
     }
   }
   ```

**Files to Modify:**
- `src/notifications/notifications.service.ts`

**Testing:**
- Test channel selection logic
- Test multi-channel delivery
- Test user preferences

---

## 🔍 Phase 5: AI Anomaly Detection Service Integration

### 5.1 Integrate Payment Anomaly Detection

**Current State:**
- ⚠️ `AIAnomalyDetectorService.detectPaymentAnomalies()` exists but not used
- ⚠️ No anomaly monitoring

**Tasks:**

1. **Add Scheduled Anomaly Detection**
   ```typescript
   // In monitoring module or new anomaly-monitoring.service.ts
   @Cron(CronExpression.EVERY_6_HOURS)
   async detectPaymentAnomalies() {
     const anomalies = await this.aiAnomalyDetectorService.detectPaymentAnomalies();
     
     for (const anomaly of anomalies) {
       // Log anomaly
       this.logger.warn(`Payment anomaly detected: ${anomaly.description}`, anomaly);
       
       // Alert administrators
       await this.notificationsService.create({
         userId: this.getAdminUserId(),
         type: NotificationType.SYSTEM_ALERT,
         title: 'Payment Anomaly Detected',
         message: anomaly.description,
         metadata: anomaly,
       });
       
       // Take automated action if configured
       if (anomaly.severity === 'CRITICAL') {
         await this.handleCriticalAnomaly(anomaly);
       }
     }
   }
   ```

**Files to Create/Modify:**
- `src/monitoring/anomaly-monitoring.service.ts` (new)
- `src/monitoring/monitoring.module.ts`

**Testing:**
- Test anomaly detection with various patterns
- Test alert generation
- Test automated responses

---

### 5.2 Integrate Maintenance Anomaly Detection

**Tasks:**

1. **Add Maintenance Anomaly Detection**
   ```typescript
   @Cron(CronExpression.EVERY_HOUR)
   async detectMaintenanceAnomalies() {
     const anomalies = await this.aiAnomalyDetectorService.detectMaintenanceAnomalies();
     
     for (const anomaly of anomalies) {
       // Handle maintenance spikes, unusual patterns, etc.
       // ...
     }
   }
   ```

---

### 5.3 Integrate System Performance Monitoring

**Tasks:**

1. **Add Performance Anomaly Detection**
   ```typescript
   @Cron(CronExpression.EVERY_5_MINUTES)
   async detectPerformanceAnomalies() {
     const anomalies = await this.aiAnomalyDetectorService.detectPerformanceAnomalies();
     
     for (const anomaly of anomalies) {
       // Alert on slow API responses, high error rates, etc.
       // ...
     }
   }
   ```

---

## 🔄 Phase 6: Workflow Engine Integration

### 6.1 Add AI Steps to Workflow Engine

**Tasks:**

1. **Add AI Step Types**
   ```typescript
   // In workflow.types.ts
   export type StepType =
     | 'CREATE_LEASE'
     | 'SEND_EMAIL'
     | 'SCHEDULE_INSPECTION'
     | 'CREATE_MAINTENANCE_REQUEST'
     | 'ASSIGN_TECHNICIAN'
     | 'SEND_NOTIFICATION'
     | 'ASSIGN_PRIORITY_AI' // New
     | 'ASSESS_PAYMENT_RISK_AI' // New
     | 'PREDICT_RENEWAL_AI' // New
     | 'PERSONALIZE_NOTIFICATION_AI' // New
     | 'CONDITIONAL'
     | 'CUSTOM';
   ```

2. **Implement AI Step Handlers**
   ```typescript
   // In workflow-engine.service.ts
   private async executeStep(step: WorkflowStep, execution: WorkflowExecution, userId?: number) {
     switch (step.type) {
       case 'ASSIGN_PRIORITY_AI':
         return await this.executeAssignPriorityAI(step, execution, userId);
       case 'ASSESS_PAYMENT_RISK_AI':
         return await this.executeAssessPaymentRiskAI(step, execution, userId);
       case 'PREDICT_RENEWAL_AI':
         return await this.executePredictRenewalAI(step, execution, userId);
       case 'PERSONALIZE_NOTIFICATION_AI':
         return await this.executePersonalizeNotificationAI(step, execution, userId);
       // ... existing cases
     }
   }
   ```

3. **Update Existing Workflows**
   ```typescript
   // Update 'maintenance-request-lifecycle' workflow
   {
     id: 'assign-priority',
     type: 'ASSIGN_PRIORITY_AI', // Changed from CUSTOM
     input: { requestId: '${output.maintenanceRequestId}' },
   }
   ```

**Files to Modify:**
- `src/workflows/workflow.types.ts`
- `src/workflows/workflow-engine.service.ts`

**Testing:**
- Test AI steps in workflows
- Test error handling
- Test workflow execution with AI failures

---

## ⚙️ Phase 7: Configuration & Environment Setup

### 7.1 Environment Variables

**Add to `.env.example`:**
```bash
# AI Services Configuration
AI_ENABLED=true
AI_MAINTENANCE_ENABLED=true
AI_PAYMENT_ENABLED=true
AI_LEASE_RENEWAL_ENABLED=true
AI_NOTIFICATION_ENABLED=true
AI_ANOMALY_DETECTION_ENABLED=true

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# AI Service Timeouts (ms)
AI_SERVICE_TIMEOUT=10000
AI_SERVICE_RETRY_ATTEMPTS=3

# ML Service Configuration
ML_SERVICE_URL=http://localhost:8000

# Feature Flags
ENABLE_AI_PRIORITY_ASSIGNMENT=true
ENABLE_AI_TECHNICIAN_ASSIGNMENT=true
ENABLE_AI_SLA_PREDICTION=true
ENABLE_AI_PAYMENT_RISK_ASSESSMENT=true
ENABLE_AI_SMART_REMINDERS=true
ENABLE_AI_RENEWAL_PREDICTION=true
ENABLE_AI_NOTIFICATION_TIMING=true
ENABLE_AI_ANOMALY_DETECTION=true
```

### 7.2 Configuration Service Updates

**Update `config.service.ts` or use `@nestjs/config`:**
```typescript
// Ensure all AI config is loaded
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
```

---

## 🧪 Phase 8: Testing Strategy

### 8.1 Unit Tests

**Create test files:**
- `ai-maintenance.service.spec.ts`
- `ai-payment.service.spec.ts`
- `ai-lease-renewal.service.spec.ts`
- `ai-notification.service.spec.ts`
- `ai-anomaly-detector.service.spec.ts`

**Test Coverage:**
- ✅ AI service initialization
- ✅ API calls with mocked OpenAI
- ✅ Fallback behavior
- ✅ Error handling
- ✅ Rate limiting
- ✅ Caching

### 8.2 Integration Tests

**Test Scenarios:**
1. **Maintenance Request with AI Priority**
   - Create request without priority
   - Verify AI assigns priority
   - Verify fallback if AI fails

2. **Payment Processing with Risk Assessment**
   - Process payment with high risk
   - Verify payment plan suggestion
   - Verify reminder timing

3. **Lease Renewal with AI Prediction**
   - Check lease expiring in 90 days
   - Verify renewal prediction
   - Verify offer generation

4. **Notification with AI Timing**
   - Create notification with AI timing
   - Verify optimal time calculation
   - Verify scheduled delivery

### 8.3 E2E Tests

**Test Workflows:**
1. Complete maintenance request lifecycle with AI
2. Payment processing workflow with risk assessment
3. Lease renewal workflow with AI predictions
4. Notification delivery with AI optimization

---

## 📊 Phase 9: Monitoring & Observability

### 9.1 Logging

**Add Structured Logging:**
```typescript
// In each AI service
this.logger.log('AI service called', {
  service: 'AIMaintenanceService',
  method: 'assignPriorityWithAI',
  requestId: requestId,
  responseTime: responseTime,
  success: true,
  cached: false,
});
```

### 9.2 Metrics

**Track Key Metrics:**
- AI service call count
- AI service response time
- AI service error rate
- AI service cache hit rate
- OpenAI API cost per request
- Fallback usage rate

**Implementation:**
- Use Prometheus metrics
- Export to Grafana dashboard
- Set up alerts for high error rates

### 9.3 Alerting

**Set Up Alerts:**
- AI service error rate > 5%
- AI service response time > 2s
- OpenAI API quota exceeded
- Fallback usage > 20%

---

## 🚀 Phase 10: Deployment Plan

### 10.1 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] OpenAI API key set
- [ ] Feature flags configured
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Documentation updated

### 10.2 Deployment Strategy

**Phase 1: Canary Deployment**
1. Deploy to staging environment
2. Enable AI for 10% of requests
3. Monitor metrics for 24 hours
4. Gradually increase to 100%

**Phase 2: Production Deployment**
1. Deploy to production
2. Enable AI for maintenance requests only
3. Monitor for 48 hours
4. Enable AI for payments
5. Monitor for 48 hours
6. Enable AI for lease renewals
7. Monitor for 48 hours
8. Enable AI for notifications
9. Enable AI for anomaly detection

### 10.3 Rollback Plan

**If Issues Detected:**
1. Disable AI via feature flags
2. System falls back to non-AI behavior
3. Investigate issues
4. Fix and redeploy

---

## 📝 Implementation Timeline

### Week 1: Foundation
- **Day 1-2:** Complete AI Maintenance Service integration
- **Day 3-4:** Complete AI Payment Service integration
- **Day 5:** Testing and bug fixes

### Week 2: Core Features
- **Day 1-2:** Complete AI Lease Renewal Service integration
- **Day 3-4:** Complete AI Notification Service integration
- **Day 5:** Testing and bug fixes

### Week 3: Advanced Features
- **Day 1-2:** AI Anomaly Detection integration
- **Day 3:** Workflow Engine integration
- **Day 4-5:** Testing and bug fixes

### Week 4: Polish & Deploy
- **Day 1-2:** Monitoring and observability
- **Day 3:** Documentation
- **Day 4:** Deployment preparation
- **Day 5:** Production deployment

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ All 5 AI services integrated and functional
- ✅ All workflows use AI where applicable
- ✅ Graceful fallback when AI fails
- ✅ All scheduled jobs running with AI

### Performance Requirements
- ✅ AI response time < 500ms (with caching)
- ✅ System performance not degraded
- ✅ < 1% error rate for AI operations

### Cost Requirements
- ✅ Cost per request < $0.01
- ✅ Monthly OpenAI API cost < $500
- ✅ Effective caching reduces API calls by 70%+

### Quality Requirements
- ✅ 80%+ test coverage for AI services
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Documentation complete

---

## 📚 Additional Resources

### Documentation to Create
1. **AI Services Architecture Diagram**
2. **Integration Guide for Developers**
3. **Configuration Guide**
4. **Troubleshooting Guide**
5. **API Reference**

### Code Examples
- Example workflow using AI services
- Example error handling
- Example testing patterns

---

## 🔄 Maintenance & Updates

### Regular Tasks
- Monitor AI service performance weekly
- Review OpenAI API costs monthly
- Update AI prompts quarterly
- Retrain ML models as needed
- Review and update fallback logic

### Continuous Improvement
- A/B test AI vs non-AI workflows
- Collect user feedback
- Optimize prompts based on results
- Add new AI capabilities
- Improve accuracy over time

---

**Last Updated:** January 2025  
**Status:** Ready for Implementation  
**Estimated Effort:** 4 weeks (1 developer)

