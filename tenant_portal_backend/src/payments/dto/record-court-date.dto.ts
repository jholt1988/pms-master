import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordCourtDateDto {
  @IsUUID()
  leaseId!: string;

  @IsDateString()
  courtDate!: string;

  @IsOptional()
  @IsString()
  docketNumber?: string;

  @IsOptional()
  @IsString()
  courtroom?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
