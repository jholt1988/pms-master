import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Status } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class UpdateMaintenanceStatusDto {
  @IsEnumSafe(Status)
  status!: Status;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
