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

  /**
   * @deprecated Ignored by the server for security. Public self-registration
   * always creates a TENANT account (see AuthService.register); any value sent
   * here is discarded. The field is retained and still whitelisted only so that
   * existing clients which post a `role` are not rejected by the global
   * `forbidNonWhitelisted` ValidationPipe. Assign privileged roles via the
   * authenticated POST /users endpoint instead.
   */
  @IsIn(ROLE_VALUES)
  @IsOptional()
  role?: RoleValue;

  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  organization?: string;
}
