/**
 * Maintenance Request Types
 * Types for maintenance requests, status tracking, and photo attachments
 */

/**
 * Maintenance request priority levels
 */
export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

/**
 * Maintenance request status
 */
export enum MaintenanceStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Maintenance request category
 */
export enum MaintenanceCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HVAC = 'HVAC',
  APPLIANCE = 'APPLIANCE',
  STRUCTURAL = 'STRUCTURAL',
  PEST_CONTROL = 'PEST_CONTROL',
  LOCKS_KEYS = 'LOCKS_KEYS',
  LANDSCAPING = 'LANDSCAPING',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

/**
 * Photo attachment for maintenance request
 */
export interface MaintenancePhoto {
  id: number;
  maintenanceRequestId: number;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: string;
}

/**
 * Technician assigned to maintenance request
 */
export interface Technician {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  specialty?: string;
}

/**
 * Status history entry
 */
export interface MaintenanceStatusHistory {
  id: number;
  maintenanceRequestId: number;
  status: MaintenanceStatus;
  notes?: string;
  changedBy: string;
  changedAt: string;
}

/**
 * Maintenance request
 */
export interface MaintenanceRequest {
  id: number;
  tenantId: number;
  unitId: number;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  title: string;
  description: string;
  permissionToEnter: boolean;
  preferredDate?: string; // ISO date string
  preferredTimeSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME';
  
  // Assigned technician
  technicianId?: number;
  technician?: Technician;
  
  // SLA tracking
  responseDeadline?: string; // ISO date string
  resolutionDeadline?: string; // ISO date string
  
  // Completion info
  completedAt?: string;
  completionNotes?: string;
  tenantSignature?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Relations
  photos?: MaintenancePhoto[];
  statusHistory?: MaintenanceStatusHistory[];
}

/**
 * Request to create a maintenance request
 */
export interface CreateMaintenanceRequest {
  unitId: number;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  title: string;
  description: string;
  permissionToEnter: boolean;
  preferredDate?: string;
  preferredTimeSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME';
  photoUris?: string[]; // Local URIs of photos to upload
}

/**
 * Request to update a maintenance request
 */
export interface UpdateMaintenanceRequest {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  preferredDate?: string;
  preferredTimeSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME';
}

/**
 * Maintenance request summary statistics
 */
export interface MaintenanceSummary {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  averageResolutionTime?: number; // in hours
}
