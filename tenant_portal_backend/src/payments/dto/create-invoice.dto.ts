import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsUUID()
  leaseId!: string;
}
