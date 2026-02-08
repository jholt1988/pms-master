import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmMaintenanceCompleteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
