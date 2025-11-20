import { IsBoolean, IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { LeaseStatus, LeaseTerminationParty } from '@prisma/client';

export class UpdateLeaseStatusDto {
  @IsEnum(LeaseStatus)
  status!: LeaseStatus;

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
  @IsISO8601()
  renewalDueAt?: string;

  @IsOptional()
  @IsISO8601()
  renewalAcceptedAt?: string;

  @IsOptional()
  @IsISO8601()
  terminationEffectiveAt?: string;

  @IsOptional()
  @IsEnum(LeaseTerminationParty)
  terminationRequestedBy?: LeaseTerminationParty;

  @IsOptional()
  @MaxLength(500)
  terminationReason?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  rentEscalationPercent?: number;

  @IsOptional()
  @IsISO8601()
  rentEscalationEffectiveAt?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  currentBalance?: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
