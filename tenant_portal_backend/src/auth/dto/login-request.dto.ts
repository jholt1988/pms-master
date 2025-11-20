import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  mfaCode?: string;
}
