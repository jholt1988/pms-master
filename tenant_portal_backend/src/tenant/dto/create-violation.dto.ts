import { IsString, IsOptional } from 'class-validator';

export class CreateViolationDto {
  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  metadata?: any;
}
