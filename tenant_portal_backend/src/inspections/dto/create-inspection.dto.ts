import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { InspectionType } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class CreateInspectionDto {
  @IsUUID()
  unitId!: string;

  @IsUUID()
  propertyId!: string;

  @IsEnumSafe(InspectionType)
  type!: InspectionType;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
