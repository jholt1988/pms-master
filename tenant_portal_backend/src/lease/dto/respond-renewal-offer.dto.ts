import { IsOptional, MaxLength } from 'class-validator';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export enum RenewalDecision {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export class RespondRenewalOfferDto {
  @IsEnumSafe(RenewalDecision)
  decision!: RenewalDecision;

  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

