import { ApplicationDecisionReasonCode } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum RentalApplicationReviewAction {
  APPROVE = 'APPROVE',
  CONDITIONAL_APPROVE = 'CONDITIONAL_APPROVE',
  DENY = 'DENY',
  REQUEST_INFO = 'REQUEST_INFO',
  SCHEDULE_INTERVIEW = 'SCHEDULE_INTERVIEW',
}

export class RentalApplicationReviewActionDto {
  @IsEnum(RentalApplicationReviewAction)
  action!: RentalApplicationReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(ApplicationDecisionReasonCode)
  reasonCode?: ApplicationDecisionReasonCode;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  responseDeadline?: string;

  // Conditional approval fields
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  conditionalDeposit?: number;

  @IsOptional()
  @IsBoolean()
  requiresCosigner?: boolean;
}
