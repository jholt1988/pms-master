import { IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum RenewalDecision {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export class RespondRenewalOfferDto {
  @IsEnum(RenewalDecision)
  decision!: RenewalDecision;

  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

