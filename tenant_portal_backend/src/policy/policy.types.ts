import { z } from 'zod';

export type UUID = string;

export type Decision =
  | 'APPROVE'
  | 'CONDITIONAL_APPROVE'
  | 'DENY'
  | 'WAITLIST'
  | 'ESCALATE'
  | 'NO_ACTION'
  | 'GENERATE_NOTICE'
  | 'GENERATE_PAYMENT_PLAN'
  | 'REFER_ATTORNEY'
  | 'APPLY_LATE_FEE';

export const PolicyBundleSchema = z.object({
  version: z.string().min(1),
  propertyId: z.string().uuid(),
  jurisdiction: z.object({
    code: z.string().min(1),
    gracePeriodDays: z.number().int().nonnegative(),
    lateFeeType: z.enum(['FLAT', 'PERCENTAGE']),
    lateFeeAmount: z.number().nonnegative(),
    maxLateFeeCap: z.number().nonnegative().optional(),
    noticeType: z.enum(['THREE_DAY', 'FIVE_DAY', 'CUSTOM']),
    noticeTemplateVersion: z.string().min(1),
    denialTemplateVersion: z.string().min(1),
    requireServiceProofForEscalation: z.boolean(),
  }),
  underwriting: z.object({
    approveMinITR: z.number().nonnegative(),
    conditionalMinITR: z.number().nonnegative(),
    denyBelowITR: z.number().nonnegative(),
    requireNoRecentEvictionYears: z.number().int().nonnegative(),
    minimumCreditBand: z.enum(['POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT']),
    allowThinCreditConditional: z.boolean(),
    requireSecondApprovalForDenyToApproveOverride: z.boolean(),
  }),
  denialCompliance: z.object({
    requireAdverseActionNotice: z.boolean(),
    autoSend: z.boolean(),
    allowedChannels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP', 'PHYSICAL'])),
    includeConsumerReportingAgencyBlock: z.boolean(),
    includeDisputeRightsBlock: z.boolean(),
    templateVersion: z.string().min(1),
  }),
  waitlist: z.object({
    enabled: z.boolean(),
    ttlDays: z.number().int().nonnegative(),
    offerWindowHours: z.number().int().positive(),
    notifyTopN: z.number().int().positive(),
    rankingStrategy: z.enum(['SCORE_THEN_TIMESTAMP', 'TIMESTAMP_ONLY', 'MANUAL_PRIORITY']),
  }),
  leaseFieldMappings: z.array(z.object({
    leaseField: z.string().min(1),
    sourcePath: z.string().min(1),
    required: z.boolean(),
    transform: z.enum(['NONE', 'MASK_SSN', 'UPPERCASE', 'DATE_ONLY']).optional(),
    editableBeforeSend: z.boolean(),
  })),
  signing: z.object({
    signerOrder: z.array(z.enum(['TENANT', 'GUARANTOR', 'MANAGER', 'OWNER'])),
    sameRoleParallelAllowed: z.boolean(),
    reminderEveryHours: z.number().int().positive(),
    expireAfterDays: z.number().int().positive(),
  }),
  maintenanceTaxonomy: z.object({
    categories: z.array(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      subcategories: z.array(z.object({
        code: z.string().min(1),
        name: z.string().min(1),
      })),
      defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
      slaHours: z.number().int().positive().optional(),
    })),
  }),
  afterHoursDispatch: z.object({
    enabled: z.boolean(),
    businessHoursTimezone: z.string().min(1),
    businessHoursByDay: z.record(z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      closed: z.boolean().optional(),
    })),
    emergencyOnly: z.boolean(),
    strategy: z.enum(['ROUND_ROBIN', 'PRIORITY_LIST']),
    vendorResponseTimeoutMinutes: z.number().int().positive(),
    escalationNotifyOwner: z.boolean(),
  }),
  serviceProof: z.object({
    requiredForLegalNotice: z.boolean(),
    acceptedMethods: z.array(z.enum(['DOOR_POSTING', 'MAILBOX_DROP', 'CERTIFIED_MAIL'])),
    requirePhotoProof: z.boolean(),
    requireGeoTimestamp: z.boolean(),
    allowStaffAttestation: z.boolean(),
    requireTrackingNumberForMail: z.boolean(),
  }),
  reminders: z.object({
    tenantChannels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP', 'PHYSICAL'])),
    operatorChannels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP', 'PHYSICAL'])),
    offsetsDays: z.array(z.number().int()),
    suppressIfZeroBalance: z.boolean(),
    tailorForPartialPayments: z.boolean(),
  }),
  paymentPlan: z.object({
    enabled: z.boolean(),
    maxPlanDurationDays: z.number().int().positive(),
    defaultInstallmentCountMin: z.number().int().positive(),
    defaultInstallmentCountMax: z.number().int().positive(),
    minimumInstallmentAmount: z.number().positive(),
    requireManagerApproval: z.boolean(),
    continueCurrentRentDuringPlan: z.boolean(),
    reportingEnabled: z.boolean(),
  }),
  attorneyHandoff: z.object({
    enabled: z.boolean(),
    method: z.enum(['SECURE_EMAIL', 'API']),
    requiredArtifacts: z.array(z.enum(['LEASE', 'LEDGER_SNAPSHOT', 'NOTICE', 'COMM_LOG', 'TENANT_PROFILE'])),
    blockReferralIfArtifactsMissing: z.boolean(),
  }),
  quickbooks: z.object({
    rentIncomeAccount: z.string().min(1),
    lateFeeIncomeAccount: z.string().min(1),
    repairExpenseAccount: z.string().min(1),
    mortgageAccount: z.string().min(1),
    depositLiabilityAccount: z.string().min(1),
    taxExpenseAccount: z.string().min(1),
  }),
  closeRules: z.object({
    monthlyCloseEnabled: z.boolean(),
    lockPeriodAfterClose: z.boolean(),
    reopenRequiresRole: z.enum(['OWNER', 'ACCOUNTING_ADMIN']),
    adjustmentsCreateJournalEntries: z.boolean(),
  }),
  retentionTamper: z.object({
    auditRetentionYears: z.number().int().positive(),
    financialRetentionYears: z.number().int().positive(),
    appendOnlyAudit: z.boolean(),
    hashChainingEnabled: z.boolean(),
    allowHardDeleteAudit: z.boolean(),
  }),
  renewalOffers: z.object({
    autoSendStandardRenewal: z.boolean(),
    discountedOfferRequiresOwnerApproval: z.boolean(),
    customTermsRequireManagerAndOwnerApproval: z.boolean(),
  }),
  churnGovernance: z.object({
    enabled: z.boolean(),
    advisoryOnly: z.boolean(),
    explanationRequired: z.boolean(),
    retrainCadenceDays: z.number().int().positive(),
    requireVersionedPredictions: z.boolean(),
  }),
  listingProviders: z.object({
    supportedProviders: z.array(z.enum(['APARTMENTS_COM', 'ZILLOW', 'MANUAL'])),
    publishStrategy: z.enum(['MANUAL_FIRST', 'API_IF_AVAILABLE']),
    autoUnpublishOnLease: z.boolean(),
    requireUnitRentReadyBeforePublish: z.boolean(),
  }),
});

export type PolicyBundle = z.infer<typeof PolicyBundleSchema>;

