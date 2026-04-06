import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReferDelinquencyAttorneyDto {
  @IsUUID()
  leaseId!: string;

  @IsEmail()
  attorneyEmail!: string;

  @IsBoolean()
  approvalConfirmed!: boolean;

  @IsOptional()
  @IsString()
  attorneyName?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
