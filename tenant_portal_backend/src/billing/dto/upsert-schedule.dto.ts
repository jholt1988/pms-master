import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { BillingFrequency } from '@prisma/client';

export class UpsertScheduleDto {
  @IsNumber()
  @IsPositive()
  leaseId!: number;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsEnum(BillingFrequency)
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
