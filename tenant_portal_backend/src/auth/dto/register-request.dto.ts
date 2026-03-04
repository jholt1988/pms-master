import { IsString, MinLength, IsOptional, IsEmail, IsIn } from 'class-validator';

const ROLE_VALUES = ['TENANT', 'PROPERTY_MANAGER', 'OWNER', 'ADMIN'] as const;
type RoleValue = (typeof ROLE_VALUES)[number];

export class RegisterRequestDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsIn(ROLE_VALUES)
  @IsOptional()
  role?: RoleValue;

  @IsString()
  @IsEmail()
  email!: string;
}
