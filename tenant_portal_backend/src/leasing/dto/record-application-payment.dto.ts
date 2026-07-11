import { IsNumber, IsPositive, Max } from 'class-validator';

/** Body for POST /applications/:id/payment. */
export class RecordApplicationPaymentDto {
  @IsNumber()
  @IsPositive()
  @Max(1_000_000)
  amount!: number;
}
