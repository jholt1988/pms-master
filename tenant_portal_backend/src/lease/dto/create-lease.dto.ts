import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsPositive, IsUUID, MaxLength, Min } from 'class-validator';
import { LeaseStatus } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class CreateLeaseDto {
  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

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

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;
}
