import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsNumber()
  @Min(0.01, { message: 'Amount per installment must be greater than 0' })
  @Type(() => Number)
  amountPerInstallment!: number;

  @IsNumber()
  @Min(0.01, { message: 'Total amount must be greater than 0' })
  @Type(() => Number)
  totalAmount!: number;
}

