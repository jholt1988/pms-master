import { IsEnum, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { InspectionType } from '@prisma/client';

export class CreateInspectionDto {
  @IsUUID()
  unitId!: string;

  @IsUUID()
  propertyId!: string;

  @IsEnum(InspectionType)
  type!: InspectionType;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
