import { IsString, MinLength } from 'class-validator';

export class VoidManualChargeDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
