import { IsDateString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsNumber()
  leaseId!: number;
}
