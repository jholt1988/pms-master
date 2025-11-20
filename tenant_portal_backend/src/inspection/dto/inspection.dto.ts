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
  Max
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
  @IsInt()
  propertyId!: number;

  @IsInt()
  @IsOptional()
  unitId?: number;

  @IsInt()
  @IsOptional()
  leaseId?: number;

  @IsEnum(InspectionType)
  type!: InspectionType;

  @IsDateString()
  scheduledDate!: string;

  @IsInt()
  @IsOptional()
  inspectorId?: number;

  @IsInt()
  @IsOptional()
  tenantId?: number;

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

  @IsInt()
  @IsOptional()
  inspectorId?: number;

  @IsInt()
  @IsOptional()
  tenantId?: number;

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
  @IsInt()
  userId!: number;

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

  @IsInt()
  @IsOptional()
  maintenanceRequestId?: number;

  @IsInt()
  @IsOptional()
  propertyId?: number;

  @IsInt()
  @IsOptional()
  unitId?: number;
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
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  propertyId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  unitId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  leaseId?: number;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsEnum(InspectionType)
  @IsOptional()
  type?: InspectionType;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  inspectorId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  tenantId?: number;

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

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  maintenanceRequestId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  propertyId?: number;

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