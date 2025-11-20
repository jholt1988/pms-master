import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsNumber()
  invoiceId?: number;

  @IsNumber()
  leaseId!: number;

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

