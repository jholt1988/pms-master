import { EsignEnvelopeStatus, EsignParticipantStatus, LeaseStatus, Role } from '@prisma/client';

export type OperatorLeaseSigningActor = {
  userId: string;
  username?: string;
  role: Role;
};

export type OperatorLeaseSigningMetrics = {
  draftLeases: number;
  packetsReady: number;
  envelopesSent: number;
  signaturesCompleted: number;
  signingBlocked: number;
  riskItems: number;
};

export type OperatorLeaseSigningParticipant = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: EsignParticipantStatus;
  userId: string | null;
};

export type OperatorLeaseSigningEnvelope = {
  id: number;
  providerEnvelopeId: string;
  status: EsignEnvelopeStatus;
  providerStatus: string | null;
  createdAt: string;
  updatedAt: string;
  participants: OperatorLeaseSigningParticipant[];
  signedPdfDocumentId: number | null;
  auditTrailDocumentId: number | null;
  canonicalRoute: string;
};

export type OperatorLeaseSigningItem = {
  leaseId: string;
  leaseStatus: LeaseStatus;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string;
  unitLabel: string | null;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  documentCount: number;
  latestEnvelope: OperatorLeaseSigningEnvelope | null;
  nextAction: 'generate_packet' | 'send_for_signature' | 'monitor_signature' | 'complete' | 'blocked';
  blockers: string[];
  canonicalRoute: string;
};

export type OperatorLeaseSigningWorkbench = {
  generatedAt: string;
  metrics: OperatorLeaseSigningMetrics;
  items: OperatorLeaseSigningItem[];
  riskQueue: unknown;
  sourceLinks: Array<{
    label: string;
    href: string;
    entityType: string;
  }>;
};

export type SendLeaseEnvelopePayload = {
  templateId?: string;
  message?: string;
  signerEmail?: string;
  signerName?: string;
  provider?: 'DOCUSIGN' | 'HELLOSIGN';
};
