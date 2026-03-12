import { IsInt, IsString, IsOptional, IsBoolean, IsDateString, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

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
  DAMAGED = 'DAMAGED',
  NON_FUNCTIONAL = 'NON_FUNCTIONAL',
}

export enum SeverityLevel {
  LOW = 'LOW',
  MED = 'MED',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

export enum InspectionIssueType {
  INVESTIGATE = 'INVESTIGATE',
  REPAIR = 'REPAIR',
  REPLACE = 'REPLACE',
}

export enum MeasurementUnit {
  COUNT = 'COUNT',
  LINEAR_FT = 'LINEAR_FT',
  SQFT = 'SQFT',
  INCH = 'INCH',
  FOOT = 'FOOT',
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

export enum InspectionRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  STARTED = 'STARTED',
}

// Basic DTOs without complex validation
export class CreateInspectionDto {
  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsEnumSafe(InspectionType)
  type!: InspectionType;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsUUID()
  inspectorId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;
}

export class CreateRoomDto {
  name!: string;
  roomType!: RoomType;
}

export class CreateChecklistItemDto {
  @IsString()
  category!: string;

  @IsString()
  itemName!: string;

  @IsOptional()
  @IsEnumSafe(InspectionCondition)
  condition?: InspectionCondition;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  estimatedAge?: number;

  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  // Structured action inputs (optional)
  @IsOptional()
  @IsEnumSafe(SeverityLevel)
  severity?: SeverityLevel;

  @IsOptional()
  @IsEnumSafe(InspectionIssueType)
  issueType?: InspectionIssueType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  measurementValue?: number;

  @IsOptional()
  @IsEnumSafe(MeasurementUnit)
  measurementUnit?: MeasurementUnit;

  @IsOptional()
  @IsString()
  measurementNotes?: string;
}

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsEnumSafe(InspectionCondition)
  condition?: InspectionCondition;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  estimatedAge?: number;

  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  // Structured action inputs (optional)
  @IsOptional()
  @IsEnumSafe(SeverityLevel)
  severity?: SeverityLevel;

  @IsOptional()
  @IsEnumSafe(InspectionIssueType)
  issueType?: InspectionIssueType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  measurementValue?: number;

  @IsOptional()
  @IsEnumSafe(MeasurementUnit)
  measurementUnit?: MeasurementUnit;

  @IsOptional()
  @IsString()
  measurementNotes?: string;
}

export class UpdateChecklistItemBatchEntryDto {
  @IsInt()
  itemId!: number;

  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  @IsOptional()
  @IsEnumSafe(InspectionCondition)
  condition?: InspectionCondition;

  @IsOptional()
  @IsEnumSafe(SeverityLevel)
  severity?: SeverityLevel;

  @IsOptional()
  @IsEnumSafe(InspectionIssueType)
  issueType?: InspectionIssueType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  measurementValue?: number;

  @IsOptional()
  @IsEnumSafe(MeasurementUnit)
  measurementUnit?: MeasurementUnit;

  @IsOptional()
  @IsString()
  measurementNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRoomChecklistItemsDto {
  items!: UpdateChecklistItemBatchEntryDto[];
}

export class UploadPhotoDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

export class CreateSignatureDto {
  @IsUUID()
  userId!: string;
  role!: string;
  signatureData!: string;
}

export class CreateEstimateDto {
  inspectionId?: number;

  @IsOptional()
  @IsUUID()
  maintenanceRequestId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;
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

export class UpdateInspectionStatusDto {
  @IsEnumSafe(InspectionStatus)
  status!: InspectionStatus;
}

export class InspectionQueryDto {
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  status?: InspectionStatus;
  type?: InspectionType;
  inspectorId?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export class EstimateQueryDto {
  inspectionId?: number;
  maintenanceRequestId?: string;
  propertyId?: string;
  status?: EstimateStatus;
  limit?: number;
  offset?: number;
}

export class CreateInspectionWithRoomsDto {
  inspection?: CreateInspectionDto;
  rooms?: CreateRoomDto[];
  propertyType?: 'apartment' | 'house' | 'commercial';

  // Flat inspection fields (supported by service)
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  tenantId?: string;
  type?: InspectionType;
  scheduledDate?: string;
  inspectorId?: string;
  notes?: string;
  generalNotes?: string;
}

export class CreateInspectionRequestDto {
  @IsEnumSafe(InspectionType)
  type!: InspectionType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DecideInspectionRequestDto {
  @IsString()
  decision!: 'APPROVED' | 'DENIED';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartInspectionDto {
  @IsInt()
  requestId!: number;
}
