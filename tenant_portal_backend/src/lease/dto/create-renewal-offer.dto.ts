import { IsISO8601, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateRenewalOfferDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  proposedRent!: number;

  @IsISO8601()
  proposedStart!: string;

  @IsISO8601()
  proposedEnd!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  escalationPercent?: number;

  @IsOptional()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
