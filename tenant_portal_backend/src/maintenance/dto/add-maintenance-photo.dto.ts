import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddMaintenancePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  caption?: string;

  // Backward compatibility for older JSON URL uploads.
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;
}
