import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApplicationDecisionReasonCode } from '@prisma/client';

/**
 * Body for PATCH /applications/:id/status.
 * `status` is validated as a non-empty string here and normalized/validated
 * against LeadApplicationStatus (including transition rules) in the service.
 */
export class UpdateApplicationStatusDto {
  @IsString()
  @MinLength(1)
  status!: string;

  @IsOptional()
  @IsUUID()
  reviewedById?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string;

  @IsOptional()
  @IsEnum(ApplicationDecisionReasonCode)
  reasonCode?: ApplicationDecisionReasonCode;
}
