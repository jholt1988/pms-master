import { IsIn, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApplicationDecisionReasonCode } from '@prisma/client';

export type ScreeningDecisionType = 'APPROVE' | 'DENY' | 'CONDITIONAL';

/**
 * Payload for POST /screening/:id/decision.
 *
 * A `reason` (free text) or `reasonCode` (structured) is required for DENY and
 * CONDITIONAL decisions — enforced in ScreeningService.recordDecision so the
 * decision is defensible (adverse action / fair housing).
 */
export class ScreeningDecisionDto {
  @IsIn(['APPROVE', 'DENY', 'CONDITIONAL'])
  decision: ScreeningDecisionType;

  @IsOptional()
  @IsEnum(ApplicationDecisionReasonCode)
  reasonCode?: ApplicationDecisionReasonCode;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
