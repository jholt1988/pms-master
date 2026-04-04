import { IsNumber, Min } from 'class-validator';

export class UpdateDelinquencyPriorityConfigDto {
  @IsNumber()
  @Min(0)
  daysWeight!: number;

  @IsNumber()
  @Min(0)
  amountWeight!: number;
}
