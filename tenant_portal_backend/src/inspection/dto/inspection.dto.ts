import { 
  IsString, 
  IsInt, 
  IsOptional, 
  IsEnum, 
  IsDateString, 
  IsBoolean, 
  IsArray, 
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  InspectionType, 
  InspectionStatus, 
  RoomType, 
  InspectionCondition,
  EstimateStatus 
} from '@prisma/client';

// Create Inspection DTOs
export class CreateInspectionDto {
  @IsUUID()
  propertyId!: string;

  @IsUUID()
  @IsOptional()
  unitId?: string;

  @IsUUID()
  @IsOptional()
  leaseId?: string;

  @IsEnum(InspectionType)
  type!: InspectionType;

  @IsDateString()
  scheduledDate!: string;

  @IsUUID()
  @IsOptional()
  inspectorId?: string;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  generalNotes?: string;
}

export class UpdateInspectionDto {
  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsDateString()
  @IsOptional()
  completedDate?: string;

  @IsUUID()
  @IsOptional()
  inspectorId?: string;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  generalNotes?: string;

  @IsBoolean()
  @IsOptional()
  reportGenerated?: boolean;

  @IsString()
  @IsOptional()
  reportPath?: string;
}

// Room and checklist DTOs
export class CreateRoomDto {
  @IsString()
  name!: string;

  @IsEnum(RoomType)
  roomType!: RoomType;
}

export class CreateChecklistItemDto {
  @IsString()
  category!: string;

  @IsString()
  itemName!: string;

  @IsEnum(InspectionCondition)
  @IsOptional()
  condition?: InspectionCondition;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  estimatedAge?: number;

  @IsBoolean()
  @IsOptional()
  requiresAction?: boolean;
}

export class UpdateChecklistItemDto {
  @IsEnum(InspectionCondition)
  @IsOptional()
  condition?: InspectionCondition;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  estimatedAge?: number;

  @IsBoolean()
  @IsOptional()
  requiresAction?: boolean;
}

export class CreateChecklistSubItemDto {
  @IsString()
  name!: string;

  @IsEnum(InspectionCondition)
  @IsOptional()
  condition?: InspectionCondition;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  estimatedAge?: number;
}

// Photo upload DTO
export class UploadPhotoDto {
  @IsString()
  url!: string;

  @IsString()
  @IsOptional()
  caption?: string;
}

// Signature DTO
export class CreateSignatureDto {
  @IsUUID()
  userId!: string;

  @IsString()
  role!: string;

  @IsString()
  signatureData!: string; // Base64 encoded signature
}

// Estimate DTOs
export class CreateEstimateDto {
  @IsInt()
  @IsOptional()
  inspectionId?: number;

  @IsUUID()
  @IsOptional()
  maintenanceRequestId?: string;

  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @IsUUID()
  @IsOptional()
  unitId?: string;
}

export class CreateEstimateLineItemDto {
  @IsString()
  itemDescription!: string;

  @IsString()
  location!: string;

  @IsString()
  category!: string;

  @IsString()
  issueType!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  laborHours?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  laborRate?: number;

  @IsNumber()
  @Min(0)
  laborCost!: number;

  @IsNumber()
  @Min(0)
  materialCost!: number;

  @IsNumber()
  @Min(0)
  totalCost!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  originalCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  depreciatedValue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  depreciationRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  conditionAdjustment?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  estimatedLifetime?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  currentAge?: number;

  @IsString()
  @IsOptional()
  repairInstructions?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateEstimateDto {
  @IsEnum(EstimateStatus)
  @IsOptional()
  status?: EstimateStatus;

  @IsDateString()
  @IsOptional()
  approvedAt?: string;
}

// Complex DTOs for creating inspections with rooms
export class CreateInspectionWithRoomsDto {
  @ValidateNested()
  @Type(() => CreateInspectionDto)
  inspection!: CreateInspectionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoomDto)
  @IsOptional()
  rooms?: CreateRoomDto[];

  @IsString()
  @IsOptional()
  propertyType?: 'apartment' | 'house' | 'commercial';
}

// Query DTOs
export class InspectionQueryDto {
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @IsUUID()
  @IsOptional()
  unitId?: string;

  @IsUUID()
  @IsOptional()
  leaseId?: string;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsEnum(InspectionType)
  @IsOptional()
  type?: InspectionType;

  @IsUUID()
  @IsOptional()
  inspectorId?: string;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}

export class EstimateQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  inspectionId?: number;

  @IsUUID()
  @IsOptional()
  maintenanceRequestId?: string;

  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @IsEnum(EstimateStatus)
  @IsOptional()
  status?: EstimateStatus;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}
