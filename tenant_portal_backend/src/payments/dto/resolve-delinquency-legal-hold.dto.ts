import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DelinquencyResolutionMode {
  PAID = 'PAID',
  PAYMENT_PLAN = 'PAYMENT_PLAN',
}

export class ResolveDelinquencyLegalHoldDto {
  @IsUUID()
  leaseId!: string;

  @IsEnum(DelinquencyResolutionMode)
  resolutionMode!: DelinquencyResolutionMode;

  @IsOptional()
  @IsString()
  reason?: string;
}
