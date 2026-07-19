import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @IsNotEmpty()
  description!: string;

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

  @IsDateString()
  dueDate!: string;

  // Accept UUID/string lease ids (and numeric ids, coerced to string) to support mixed environments.
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  @IsNotEmpty()
  leaseId!: string;
}
