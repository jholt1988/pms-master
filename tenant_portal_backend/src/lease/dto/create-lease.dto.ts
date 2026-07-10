import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsPositive, IsUUID, MaxLength, Min } from 'class-validator';
import { LeaseStatus } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class CreateLeaseDto {
  @ApiProperty({ format: 'date-time', description: 'Lease start date (ISO 8601).' })
  @IsISO8601()
  startDate!: string;

  @ApiProperty({ format: 'date-time', description: 'Lease end date (ISO 8601).' })
  @IsISO8601()
  endDate!: string;

  @ApiProperty({ description: 'Monthly rent amount.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  rentAmount!: number;

  @ApiProperty({ format: 'uuid', description: 'Tenant (User) id.' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: 'uuid', description: 'Unit id.' })
  @IsUUID()
  unitId!: string;

  @ApiPropertyOptional({ enum: LeaseStatus })
  @IsOptional()
  @IsEnumSafe(LeaseStatus)
  status?: LeaseStatus;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  moveInAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  moveOutAt?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  autoRenewLeadDays?: number;

  @ApiPropertyOptional({ minimum: 0 })
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
