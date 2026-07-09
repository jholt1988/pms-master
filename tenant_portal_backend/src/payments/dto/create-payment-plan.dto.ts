import { IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a payment plan
 */
export class CreatePaymentPlanDto {
  @IsNumber()
  @Min(1, { message: 'Invoice ID must be a positive number' })
  @Type(() => Number)
  invoiceId!: number;

  @IsNumber()
  @Min(1, { message: 'Number of installments must be at least 1' })
  @Max(60, { message: 'Number of installments cannot exceed 60' })
  @Type(() => Number)
  installments!: number;

  @ApiProperty({ type: Number, description: 'Per-installment dollar amount (legacy). Prefer amountPerInstallmentCents.' })
  @IsNumber()
  @Min(0.01, { message: 'Amount per installment must be greater than 0' })
  @Type(() => Number)
  amountPerInstallment!: number;

  @ApiProperty({ type: Number, description: 'Total dollar amount (legacy). Prefer totalAmountCents.' })
  @IsNumber()
  @Min(0.01, { message: 'Total amount must be greater than 0' })
  @Type(() => Number)
  totalAmount!: number;

  // Stage-A dual-send: optional integer cents. Preferred over the dollar fields when provided.
  @ApiPropertyOptional({ type: Number, description: 'Per-installment integer cents (preferred).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  amountPerInstallmentCents?: number;

  @ApiPropertyOptional({ type: Number, description: 'Total integer cents (preferred).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalAmountCents?: number;
}

