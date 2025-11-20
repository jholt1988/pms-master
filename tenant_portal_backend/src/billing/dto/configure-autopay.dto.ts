import { IsBoolean, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class ConfigureAutopayDto {
  @IsNumber()
  @IsPositive()
  leaseId!: number;

  @IsNumber()
  @IsPositive()
  paymentMethodId!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxAmount?: number;
}
