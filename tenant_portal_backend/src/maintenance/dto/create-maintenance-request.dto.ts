import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MaintenancePriority } from '@prisma/client';

export class CreateMaintenanceRequestDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsInt()
  unitId?: number;

  @IsOptional()
  @IsInt()
  assetId?: number;
}
