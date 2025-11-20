import { IsOptional, IsString, Length } from 'class-validator';

export class MfaActivateDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class MfaDisableDto {
  @IsOptional()
  @IsString()
  @Length(6, 6)
  code?: string;
}
