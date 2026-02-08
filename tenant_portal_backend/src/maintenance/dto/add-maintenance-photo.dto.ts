import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddMaintenancePhotoDto {
  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  caption?: string;
}
