import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { LeaseStatus, LeaseTerminationParty } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class UpdateLeaseStatusDto {
  @ApiProperty({ enum: LeaseStatus })
  @IsEnumSafe(LeaseStatus)
  status!: LeaseStatus;

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

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  renewalDueAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  renewalAcceptedAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  terminationEffectiveAt?: string;

  @ApiPropertyOptional({ enum: LeaseTerminationParty })
  @IsOptional()
  @IsEnumSafe(LeaseTerminationParty)
  terminationRequestedBy?: LeaseTerminationParty;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @MaxLength(500)
  terminationReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  rentEscalationPercent?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  rentEscalationEffectiveAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  currentBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
