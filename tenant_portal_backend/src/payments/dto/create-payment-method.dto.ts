import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethodType, PaymentProvider } from '@prisma/client';

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodType)
  type!: PaymentMethodType;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  providerCustomerId?: string;

  @IsOptional()
  @IsString()
  providerPaymentMethodId?: string;

  @IsOptional()
  @IsString()
  last4?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expYear?: number;
}
