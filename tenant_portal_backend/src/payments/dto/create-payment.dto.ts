import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ type: Number, description: 'Dollar amount (legacy). Prefer amountCents.' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  // Stage-A dual-send: optional integer cents. Preferred over `amount` when provided.
  @ApiPropertyOptional({ type: Number, description: 'Integer cents (preferred).' })
  @IsOptional()
  @IsString()
  @Min(0)
  amountCents?: number;

  @IsOptional()
  @IsNumber()
  invoiceId?: string;

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
