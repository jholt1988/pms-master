import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Body for PATCH /applications/:id/screening. */
export class UpdateScreeningDto {
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(850)
  creditScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  backgroundCheckStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  creditCheckStatus?: string;
}
