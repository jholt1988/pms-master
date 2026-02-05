import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDateString()
  dueDate!: string;

  // Lease IDs are Ints in the Prisma schema.
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  leaseId!: number;
}
