import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

