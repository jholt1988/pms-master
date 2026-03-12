import { Transform, Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  dueDate!: string;

  // Accept UUID/string lease ids (and numeric ids, coerced to string) to support mixed environments.
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  @IsNotEmpty()
  leaseId!: string;
}
