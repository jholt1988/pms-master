import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  // Stage-A dual-send: optional integer cents. Preferred over `amount` when provided.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountCents?: number;

  @IsDateString()
  dueDate!: string;

  // Accept UUID/string lease ids (and numeric ids, coerced to string) to support mixed environments.
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  @IsNotEmpty()
  leaseId!: string;
}
