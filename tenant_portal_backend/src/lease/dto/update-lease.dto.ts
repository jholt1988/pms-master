import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLeaseDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  moveInAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  moveOutAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  rentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  depositAmount?: number;

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

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @MaxLength(500)
  terminationReason?: string;
}
