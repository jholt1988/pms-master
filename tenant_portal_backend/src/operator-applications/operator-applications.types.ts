import {
  ApplicationDecisionReasonCode,
  ApplicationStatus,
  QualificationStatus,
  Recommendation,
  Role,
} from '@prisma/client';
import { RentalApplicationReviewAction } from '../rental-application/dto/review-action.dto';

export type OperatorApplicationsActor = {
  userId: string;
  role: Role;
  username?: string;
};

export type OperatorApplicationMetrics = {
  totalApplications: number;
  pendingReview: number;
  needsScreening: number;
  approvedReadyForLease: number;
  conditionallyApproved: number;
  denied: number;
  convertedToLease: number;
};

export type OperatorApplicationItem = {
  id: number;
  applicantName: string;
  email: string;
  phoneNumber: string;
  status: ApplicationStatus;
  propertyId: string;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  income: number;
  creditScore: number | null;
  qualificationStatus: QualificationStatus | null;
  recommendation: Recommendation | null;
  screeningScore: number | null;
  screenedAt: string | null;
  decisionedAt: string | null;
  convertedLeaseId: string | null;
  submittedAt: string;
  updatedAt: string;
  nextAction: OperatorApplicationNextAction;
  canonicalRoute: string;
};

export type OperatorApplicationNextAction =
  | 'screen'
  | 'review'
  | 'resolve_conditions'
  | 'convert_to_lease'
  | 'complete'
  | 'none';

export type OperatorApplicationLeaseHandoff = {
  applicationId: number;
  applicantName: string;
  propertyName: string | null;
  unitLabel: string | null;
  recommendedRentAmount: number;
  recommendedDepositAmount: number;
  readinessWarnings: string[];
};

export type OperatorApplicationsWorkbench = {
  generatedAt: string;
  metrics: OperatorApplicationMetrics;
  applications: OperatorApplicationItem[];
  leaseHandoffs: OperatorApplicationLeaseHandoff[];
  reviewActions: RentalApplicationReviewAction[];
  denialReasonCodes: ApplicationDecisionReasonCode[];
  sourceLinks: Array<{
    label: string;
    href: string;
    entityType: string;
  }>;
};

export type OperatorApplicationDetail = {
  generatedAt: string;
  application: OperatorApplicationItem & {
    decisionNotes: string | null;
    screeningDetails: string | null;
    screeningReasons: unknown;
    applicantId: string | null;
  };
  policyEvaluation: unknown;
  lifecycle: unknown;
  transitions: unknown;
  timeline: unknown[];
  leaseHandoff: OperatorApplicationLeaseHandoff | null;
  sourceLinks: Array<{
    label: string;
    href: string;
    entityType: string;
    entityId: string;
  }>;
};

export type ConvertApplicationToLeasePayload = {
  startDate: string;
  endDate: string;
  rentAmount?: number;
  depositAmount?: number;
  moveInAt?: string;
  noticePeriodDays?: number;
};
