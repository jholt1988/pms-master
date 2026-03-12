import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RentalApplicationReviewAction {
  APPROVE = 'APPROVE',
  DENY = 'DENY',
  REQUEST_INFO = 'REQUEST_INFO',
  SCHEDULE_INTERVIEW = 'SCHEDULE_INTERVIEW',
}

export class RentalApplicationReviewActionDto {
  @IsEnum(RentalApplicationReviewAction)
  action!: RentalApplicationReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  responseDeadline?: string;
}
