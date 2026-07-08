import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  // Stage-A dual-send: optional integer cents. Preferred over `amount` when provided.
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @IsOptional()
  @IsNumber()
  invoiceId?: number;

  @IsUUID()
  leaseId!: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsNumber()
  paymentMethodId?: number;
}
