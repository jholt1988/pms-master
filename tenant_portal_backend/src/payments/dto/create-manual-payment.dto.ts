import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ManualPaymentAppliedTo, ManualPaymentMethod } from '@prisma/client';

export class CreateManualPaymentDto {
  @IsUUID()
  leaseId!: string;

  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsUUID()
  tenantId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsEnum(ManualPaymentMethod)
  method!: ManualPaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsEnum(ManualPaymentAppliedTo)
  appliedTo?: ManualPaymentAppliedTo;

  @IsOptional()
  @IsString()
  memo?: string;
}
