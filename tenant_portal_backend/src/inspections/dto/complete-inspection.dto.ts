import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CompleteInspectionDto {
  @IsNotEmpty()
  findings: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

