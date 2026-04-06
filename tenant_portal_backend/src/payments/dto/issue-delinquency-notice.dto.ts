import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeaseNoticeDeliveryMethod } from '@prisma/client';

export class IssueDelinquencyNoticeDto {
  @IsUUID()
  leaseId!: string;

  @IsEnum(LeaseNoticeDeliveryMethod)
  deliveryMethod!: LeaseNoticeDeliveryMethod;

  @IsBoolean()
  approvalConfirmed!: boolean;

  @IsOptional()
  @IsString()
  message?: string;
}
