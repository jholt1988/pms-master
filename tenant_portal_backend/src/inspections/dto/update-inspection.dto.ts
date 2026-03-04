import { IsDateString, IsOptional, IsString } from 'class-validator';
import { InspectionStatus } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class UpdateInspectionDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnumSafe(InspectionStatus)
  status?: InspectionStatus;
}

