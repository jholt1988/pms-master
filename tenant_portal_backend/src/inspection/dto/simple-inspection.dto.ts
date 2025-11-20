import { IsEnum, IsInt, IsString, IsOptional, IsBoolean, IsDateString, IsNumber, Min, Max } from 'class-validator';

// Enums (simplified)
export enum InspectionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InspectionType {
  MOVE_IN = 'MOVE_IN',
  MOVE_OUT = 'MOVE_OUT',
  ROUTINE = 'ROUTINE',
  EMERGENCY = 'EMERGENCY',
}

export enum InspectionCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export enum RoomType {
  LIVING_ROOM = 'LIVING_ROOM',
  BEDROOM = 'BEDROOM',
  KITCHEN = 'KITCHEN',
  BATHROOM = 'BATHROOM',
  DINING_ROOM = 'DINING_ROOM',
  UTILITY = 'UTILITY',
  STORAGE = 'STORAGE',
}

export enum EstimateStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Basic DTOs without complex validation
export class CreateInspectionDto {
  propertyId!: number;
  unitId?: number;
  leaseId?: number;
  type!: InspectionType;
  scheduledDate!: string;
  inspectorId?: number;
  tenantId?: number;
  notes?: string;
  generalNotes?: string;
}

export class CreateRoomDto {
  name!: string;
  roomType!: RoomType;
}

export class CreateChecklistItemDto {
  category!: string;
  itemName!: string;
  condition?: InspectionCondition;
  notes?: string;
  estimatedAge?: number;
  requiresAction?: boolean;
}

export class UpdateChecklistItemDto {
  condition?: InspectionCondition;
  notes?: string;
  estimatedAge?: number;
  requiresAction?: boolean;
}

export class UploadPhotoDto {
  url!: string;
  caption?: string;
}

export class CreateSignatureDto {
  userId!: number;
  role!: string;
  signatureData!: string;
}

export class CreateEstimateDto {
  inspectionId?: number;
  maintenanceRequestId?: number;
  propertyId?: number;
  unitId?: number;
}

export class CreateEstimateLineItemDto {
  itemDescription!: string;
  location!: string;
  category!: string;
  issueType!: string;
  laborHours?: number;
  laborRate?: number;
  laborCost!: number;
  materialCost!: number;
  totalCost!: number;
  originalCost?: number;
  depreciatedValue?: number;
  depreciationRate?: number;
  conditionAdjustment?: number;
  estimatedLifetime?: number;
  currentAge?: number;
  repairInstructions?: string;
  notes?: string;
}

export class UpdateEstimateDto {
  status?: EstimateStatus;
  approvedAt?: string;
}

export class UpdateInspectionDto {
  status?: InspectionStatus;
  isComplete?: boolean;
  notes?: string;
  scheduledDate?: string;
  completedDate?: string;
}

export class InspectionQueryDto {
  propertyId?: number;
  unitId?: number;
  leaseId?: number;
  status?: InspectionStatus;
  type?: InspectionType;
  inspectorId?: number;
  tenantId?: number;
  limit?: number;
  offset?: number;
}

export class EstimateQueryDto {
  inspectionId?: number;
  maintenanceRequestId?: number;
  propertyId?: number;
  status?: EstimateStatus;
  limit?: number;
  offset?: number;
}

export class CreateInspectionWithRoomsDto {
  inspection!: CreateInspectionDto;
  rooms?: CreateRoomDto[];
  propertyType?: 'apartment' | 'house' | 'commercial';
}