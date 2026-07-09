/**
 * Canonical lease domain types.
 *
 * The enum unions below were previously re-declared, identically, in multiple
 * web-client files (e.g. `tenant_portal_app/src/LeaseManagementPage.tsx` and
 * `.../domains/tenant/features/lease/MyLeasePage.tsx`). They are consolidated
 * here so every client draws them from one place. Values mirror the backend
 * Prisma enums in `tenant_portal_backend/prisma/schema.prisma`.
 */

export type LeaseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'RENEWAL_PENDING'
  | 'NOTICE_GIVEN'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'HOLDOVER'
  | 'CLOSED';

export type LeaseRenewalStatus = 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';

export type LeaseNoticeType = 'MOVE_OUT' | 'RENT_INCREASE' | 'OTHER';

export type LeaseNoticeDeliveryMethod = 'EMAIL' | 'SMS' | 'PORTAL' | 'PRINT' | 'OTHER';

export type LeaseTerminationParty = 'MANAGER' | 'TENANT' | 'SYSTEM';

export type DepositDisposition = 'HELD' | 'PARTIAL_RETURN' | 'RETURNED' | 'FORFEITED';

export type BillingAlignment = 'FULL_CYCLE' | 'PRORATE';

export interface LeaseTenantRef {
  id: string;
  username: string;
  email?: string;
}

export interface LeasePropertyRef {
  id?: string;
  name: string;
}

export interface LeaseUnitRef {
  id?: string;
  name: string;
  property?: LeasePropertyRef | null;
}

/**
 * Canonical Lease read-model, mirroring the backend `Lease` entity.
 *
 * NOTE: `id` is a UUID string per the backend Prisma schema. The web clients
 * currently mistype it as `number`; adopting this interface in the page
 * components (and fixing that drift, which ripples through child components
 * like `LeaseEsignPanel`/`LeaseCard`) is a tsc-verified follow-up — see the
 * package README "Roadmap". PR1 intentionally consolidates only the enum
 * unions above, which are a type-identical, zero-risk swap.
 */
export interface Lease {
  id: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  depositHeldAt?: string | null;
  depositReturnedAt?: string | null;
  depositDisposition?: DepositDisposition | null;
  noticePeriodDays?: number | null;
  moveInAt?: string | null;
  moveOutAt?: string | null;
  autoRenew?: boolean;
  autoRenewLeadDays?: number | null;
  renewalOfferedAt?: string | null;
  renewalDueAt?: string | null;
  renewalAcceptedAt?: string | null;
  terminationReason?: string | null;
  terminationRequestedBy?: LeaseTerminationParty | null;
  terminationEffectiveAt?: string | null;
  rentEscalationPercent?: number | null;
  rentEscalationEffectiveAt?: string | null;
  billingAlignment?: BillingAlignment;
  currentBalance?: number | null;
  tenant?: LeaseTenantRef;
  unit: LeaseUnitRef;
  createdAt?: string;
  updatedAt?: string;
}
