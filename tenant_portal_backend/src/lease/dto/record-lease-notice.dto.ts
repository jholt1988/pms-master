import { IsISO8601, IsOptional, MaxLength } from 'class-validator';
import { LeaseNoticeDeliveryMethod, LeaseNoticeType } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class RecordLeaseNoticeDto {
  @IsEnumSafe(LeaseNoticeType)
  type!: LeaseNoticeType;

  @IsEnumSafe(LeaseNoticeDeliveryMethod)
  deliveryMethod!: LeaseNoticeDeliveryMethod;

  @IsOptional()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsISO8601()
  acknowledgedAt?: string;
}
