import { IsString, MinLength } from 'class-validator';

export class ReverseManualPaymentDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
