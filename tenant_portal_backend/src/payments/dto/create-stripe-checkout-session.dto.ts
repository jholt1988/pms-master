import { IsInt, IsNotEmpty, IsString, IsUrl, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStripeCheckoutSessionDto {
  // No amount field: the charged amount is derived server-side from the invoice.
  @ApiProperty({ type: Number, description: 'Invoice id whose amount (and amountCents) will be charged.' })
  @IsInt()
  @Min(1)
  invoiceId!: number;

  @ApiProperty({ type: String, description: 'Redirect URL on successful checkout.' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty({ type: String, description: 'Redirect URL on cancelled checkout.' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}
