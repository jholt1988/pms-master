import { IsBoolean, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class ConfigureAutopayDto {
  @IsUUID()
  leaseId!: string;

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
