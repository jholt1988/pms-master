import { IsString, MinLength, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterRequestDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsEmail()
  email!: string;
}
