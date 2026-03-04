import { IsString, IsNotEmpty, IsOptional, MinLength, IsIn } from 'class-validator';

const ROLE_VALUES = ['TENANT', 'PROPERTY_MANAGER', 'OWNER', 'ADMIN'] as const;
type RoleValue = (typeof ROLE_VALUES)[number];

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsIn(ROLE_VALUES)
  @IsOptional()
  role?: RoleValue;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;
}

