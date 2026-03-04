import { IsString, IsOptional, MinLength, IsEmail, IsIn } from 'class-validator';

const ROLE_VALUES = ['TENANT', 'PROPERTY_MANAGER', 'OWNER', 'ADMIN'] as const;
type RoleValue = (typeof ROLE_VALUES)[number];

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsIn(ROLE_VALUES)
  @IsOptional()
  role?: RoleValue;

  @IsEmail()
  @IsOptional()
  email?: string;
}

