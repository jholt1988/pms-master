import { IsISO8601, IsInt, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRenewalOfferDto {
  @ApiProperty({ type: Number, description: 'Proposed renewal rent in dollars (legacy). Prefer proposedRentCents.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  proposedRent!: number;

  // Stage-A dual-send: optional integer cents. Preferred over `proposedRent` when provided.
  @ApiPropertyOptional({ type: Number, description: 'Proposed renewal rent in integer cents (preferred).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  proposedRentCents?: number;

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
