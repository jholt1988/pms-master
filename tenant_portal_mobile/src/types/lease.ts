/**
 * Lease and Document Type Definitions
 * Types for lease agreements, documents, and renewal processes
 */

/**
 * Lease status enum
 */
export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  PENDING = 'PENDING',
}

/**
 * Document category enum
 */
export enum DocumentCategory {
  LEASE_AGREEMENT = 'LEASE_AGREEMENT',
  ADDENDUM = 'ADDENDUM',
  MOVE_IN_CHECKLIST = 'MOVE_IN_CHECKLIST',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  NOTICE = 'NOTICE',
  RECEIPT = 'RECEIPT',
  POLICY = 'POLICY',
  OTHER = 'OTHER',
}

/**
 * Renewal status enum
 */
export enum RenewalStatus {
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  ELIGIBLE = 'ELIGIBLE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

/**
 * Main lease interface
 */
export interface Lease {
  id: number;
  unitId: number;
  tenantId: number;
  status: LeaseStatus;
  
  // Lease terms
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  monthlyRent: number;
  securityDeposit: number;
  
  // Property info
  propertyName: string;
  unitNumber: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  
  // Lease details
  leaseTermMonths: number;
  moveInDate: string;
  noticeRequiredDays: number;
  
  // Optional fields
  parkingSpaces?: number;
  petDeposit?: number;
  storageUnit?: string;
  
  // Renewal info
  renewalEligible: boolean;
  renewalStatus?: RenewalStatus;
  renewalOfferedRent?: number;
  
  // Timestamps
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  documents?: Document[];
  tenant?: Tenant;
}

/**
 * Document interface
 */
export interface Document {
  id: number;
  leaseId: number;
  category: DocumentCategory;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number; // bytes
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Tenant info (simplified)
 */
export interface Tenant {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/**
 * Lease renewal request
 */
export interface LeaseRenewalRequest {
  leaseId: number;
  desiredTermMonths: number;
  comments?: string;
  counterOfferRent?: number;
}

/**
 * Move-out notice
 */
export interface MoveOutNotice {
  id: number;
  leaseId: number;
  noticeDate: string;
  intendedMoveOutDate: string;
  reason?: string;
  forwardingAddress?: string;
  forwardingCity?: string;
  forwardingState?: string;
  forwardingZip?: string;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'PROCESSED';
  submittedAt: string;
}

/**
 * Request to submit move-out notice
 */
export interface CreateMoveOutNotice {
  leaseId: number;
  intendedMoveOutDate: string;
  reason?: string;
  forwardingAddress?: string;
  forwardingCity?: string;
  forwardingState?: string;
  forwardingZip?: string;
}

/**
 * Lease summary for dashboard
 */
export interface LeaseSummary {
  activeLease?: Lease;
  daysUntilExpiration?: number;
  documentsCount: number;
  unreadNoticesCount: number;
  renewalAvailable: boolean;
}
