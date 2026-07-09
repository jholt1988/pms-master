import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsPositive, IsUUID, MaxLength, Min } from 'class-validator';
import { LeaseStatus } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaseDto {
  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @ApiProperty({ type: Number, description: 'Monthly rent in dollars (legacy). Prefer rentAmountCents.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  rentAmount!: number;

  @IsUUID()
  tenantId!: string;

  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsEnumSafe(LeaseStatus)
  status?: LeaseStatus;

  @IsOptional()
  @IsISO8601()
  moveInAt?: string;

  @IsOptional()
  @IsISO8601()
  moveOutAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  autoRenewLeadDays?: number;

  @ApiPropertyOptional({ type: Number, description: 'Security deposit in dollars (legacy). Prefer depositAmountCents.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;

  // Stage-A dual-send: optional integer cents. Preferred over the dollar fields when provided.
  @ApiPropertyOptional({ type: Number, description: 'Monthly rent in integer cents (preferred).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rentAmountCents?: number;

  @ApiPropertyOptional({ type: Number, description: 'Security deposit in integer cents (preferred).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmountCents?: number;
}
