import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ManualChargeType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ type: Number, description: 'Amount in integer cents.' })
  @IsString()
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
