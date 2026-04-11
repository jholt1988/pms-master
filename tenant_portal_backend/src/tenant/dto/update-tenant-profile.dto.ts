import { IsOptional, IsString, IsBoolean, IsArray } from 'class-validator';

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  pets?: any;

  @IsOptional()
  vehicles?: any;

  @IsOptional()
  @IsBoolean()
  idVerified?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
