import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateHouseholdMemberDto {
  @IsString()
  name: string;

  @IsString()
  relationship: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnLease?: boolean;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
