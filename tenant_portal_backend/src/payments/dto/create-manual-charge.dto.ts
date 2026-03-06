import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ManualChargeType } from '@prisma/client';

export class CreateManualChargeDto {
  @IsUUID()
  leaseId!: string;

  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsUUID()
  tenantId!: string;

  @IsEnum(ManualChargeType)
  chargeType!: ManualChargeType;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsDateString()
  chargeDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
