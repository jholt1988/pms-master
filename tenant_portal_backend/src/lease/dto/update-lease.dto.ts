import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateLeaseDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsISO8601()
  moveInAt?: string;

  @IsOptional()
  @IsISO8601()
  moveOutAt?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  rentAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  depositAmount?: number;

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
  @MaxLength(500)
  terminationReason?: string;
}
