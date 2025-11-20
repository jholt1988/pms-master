import { IsEnum, IsISO8601, IsOptional, MaxLength } from 'class-validator';
import { LeaseNoticeType } from '@prisma/client';

export class TenantSubmitNoticeDto {
  @IsEnum(LeaseNoticeType)
  type!: LeaseNoticeType;

  @IsISO8601()
  moveOutAt!: string;

  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

