import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LeaseStatus } from '@prisma/client';

export class CreateLeaseDto {
  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  rentAmount!: number;

  @IsInt()
  tenantId!: number;

  @IsInt()
  unitId!: number;

  @IsOptional()
  @IsEnum(LeaseStatus)
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
