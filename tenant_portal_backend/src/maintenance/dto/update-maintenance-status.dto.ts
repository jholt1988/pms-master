import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateMaintenanceStatusDto {
  @IsEnum(Status)
  status!: Status;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
