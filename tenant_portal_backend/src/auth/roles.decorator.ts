
import { SetMetadata } from '@nestjs/common';

export type AppRole = 'TENANT' | 'PROPERTY_MANAGER' | 'OWNER' | 'ADMIN';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
