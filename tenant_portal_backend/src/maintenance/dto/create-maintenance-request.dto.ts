import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MaintenancePriority } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class CreateMaintenanceRequestDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnumSafe(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsInt()
  assetId?: number;
}
