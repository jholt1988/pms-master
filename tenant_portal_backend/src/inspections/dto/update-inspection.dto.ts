import { IsEnum, IsDateString, IsOptional, IsString } from 'class-validator';
import { InspectionStatus } from '@prisma/client';

export class UpdateInspectionDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;
}

