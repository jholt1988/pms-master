import { IsISO8601, IsOptional, MaxLength } from 'class-validator';
import { LeaseNoticeType } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class TenantSubmitNoticeDto {
  @IsEnumSafe(LeaseNoticeType)
  type!: LeaseNoticeType;

  @IsISO8601()
  moveOutAt!: string;

  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

