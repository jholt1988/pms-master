import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID, Max, Min } from 'class-validator';
import { BillingFrequency } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class UpsertScheduleDto {
  @IsUUID()
  leaseId!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsEnumSafe(BillingFrequency)
  frequency: BillingFrequency = BillingFrequency.MONTHLY;

  @IsOptional()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsDateString()
  nextRun?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lateFeeAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lateFeeAfterDays?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
