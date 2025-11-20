import { IsEnum, IsISO8601, IsOptional, MaxLength } from 'class-validator';
import { LeaseNoticeDeliveryMethod, LeaseNoticeType } from '@prisma/client';

export class RecordLeaseNoticeDto {
  @IsEnum(LeaseNoticeType)
  type!: LeaseNoticeType;

  @IsEnum(LeaseNoticeDeliveryMethod)
  deliveryMethod!: LeaseNoticeDeliveryMethod;

  @IsOptional()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsISO8601()
  acknowledgedAt?: string;
}
