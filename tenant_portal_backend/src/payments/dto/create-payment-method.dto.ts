import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethodType, PaymentProvider } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class CreatePaymentMethodDto {
  @IsEnumSafe(PaymentMethodType)
  type!: PaymentMethodType;

  @IsEnumSafe(PaymentProvider)
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
  
  @IsNumber()
  expMonth?: number;

  @IsOptional()
  
  @IsNumber()
  expYear?: number;
}
