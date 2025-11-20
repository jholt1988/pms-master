import { IsEnum, IsInt, IsDateString, IsOptional, IsString } from 'class-validator';
import { InspectionType } from '@prisma/client';

export class CreateInspectionDto {
  @IsInt()
  unitId!: number;

  @IsInt()
  propertyId!: number;

  @IsEnum(InspectionType)
  type!: InspectionType;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

