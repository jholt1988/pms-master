import { IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const ROLE_VALUES = ['TENANT', 'PROPERTY_MANAGER', 'OWNER', 'ADMIN'] as const;
type RoleValue = (typeof ROLE_VALUES)[number];

export class ListUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;

  @IsOptional()
  @IsIn(ROLE_VALUES)
  role?: RoleValue;
}

