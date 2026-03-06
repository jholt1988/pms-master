import { IsInt, IsNotEmpty, IsString, IsUrl, Min } from 'class-validator';

export class CreateStripeCheckoutSessionDto {
  @IsInt()
  @Min(1)
  invoiceId!: number;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}
