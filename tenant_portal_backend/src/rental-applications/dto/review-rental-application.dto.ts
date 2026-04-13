import { ApplicationDecisionReasonCode, ApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewRentalApplicationDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsOptional()
  @IsEnum(ApplicationDecisionReasonCode)
  reasonCode?: ApplicationDecisionReasonCode;

  @IsOptional()
  @IsString()
  notes?: string;
}
