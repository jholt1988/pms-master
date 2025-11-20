import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
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
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsInt()
  unitId?: number;

  @IsOptional()
  @IsInt()
  assetId?: number;
}
