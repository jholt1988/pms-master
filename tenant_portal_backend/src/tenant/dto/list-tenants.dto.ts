import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTenantsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  take?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  healthClass?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  leaseEndingSoon?: string;

  @IsOptional()
  @IsString()
  delinquent?: string;

  @IsOptional()
  @IsString()
  onPaymentPlan?: string;

  @IsOptional()
  @IsString()
  openMaintenance?: string;

  @IsOptional()
  @IsString()
  riskLevel?: string;

  @IsOptional()
  @IsString()
  former?: string;
}
