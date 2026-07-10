import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Body for PATCH /tours/:id/status. */
export class UpdateTourStatusDto {
  @IsString()
  @MinLength(1)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
