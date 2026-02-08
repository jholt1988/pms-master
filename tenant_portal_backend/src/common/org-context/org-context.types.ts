import { OrgRole, Role } from '@prisma/client';

export interface AuthUser {
  userId: string;
  username: string;
  role: Role;
}

export interface OrgContext {
  orgId: string;
  orgRole: OrgRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    org?: OrgContext;
  }
}
