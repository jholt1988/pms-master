import { EsignEnvelopeStatus, LeaseRenewalStatus, LeaseStatus, Role } from '@prisma/client';

export type OperatorRenewalActor = {
  userId: string;
  username?: string;
  role: Role;
};

export type OperatorRenewalMetrics = {
  expiringLeases: number;
  needsOffer: number;
  offersPending: number;
  offersAccepted: number;
  signaturesPending: number;
  moveOutNotices: number;
};

export type OperatorRenewalItem = {
  leaseId: string;
  leaseStatus: LeaseStatus;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  currentRent: number;
  endDate: string;
  renewalDueAt: string | null;
  moveOutAt: string | null;
  latestOffer: {
    id: number;
    proposedRent: number;
    proposedStart: string;
    proposedEnd: string;
    status: LeaseRenewalStatus;
    expiresAt: string | null;
    respondedAt: string | null;
  } | null;
  latestEnvelope: {
    id: number;
    status: EsignEnvelopeStatus;
    providerStatus: string | null;
    participants: Array<{ id: number; name: string; email: string; status: string }>;
  } | null;
  latestNotice: {
    id: number;
    type: string;
    sentAt: string;
    message: string | null;
  } | null;
  nextAction: 'create_offer' | 'await_response' | 'send_signature' | 'monitor_signature' | 'move_out' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorRenewalsWorkbench = {
  generatedAt: string;
  metrics: OperatorRenewalMetrics;
  leases: OperatorRenewalItem[];
  sourceLinks: Array<{ label: string; href: string; entityType: string }>;
};

export type CreateRenewalOfferPayload = {
  proposedRent?: number;
  proposedStart?: string;
  proposedEnd?: string;
  escalationPercent?: number;
  message?: string;
  expiresAt?: string;
};

export type RecordRenewalResponsePayload = {
  decision: 'ACCEPTED' | 'DECLINED';
  message?: string;
};

export type SendRenewalSignaturePayload = {
  templateId?: string;
  message?: string;
  signerEmail?: string;
  signerName?: string;
};

export type RecordMoveOutPayload = {
  moveOutAt: string;
  message?: string;
  deliveryMethod?: 'EMAIL' | 'SMS' | 'PORTAL' | 'PRINT' | 'OTHER';
};
