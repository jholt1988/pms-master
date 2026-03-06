import { OrgRole, Role } from '@prisma/client';

export interface AuthUser {
  // Some parts of the codebase use { userId, role, username }
  userId?: string;
  role?: Role | string;
  username?: string;

  // Other parts (e.g., legacy controllers/tests) still reference JWT-style { sub, username }
  sub?: string | number;
}

export interface OrgContext {
  orgId: string;
  orgRole: OrgRole;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      org?: OrgContext;
    }
  }
}

export {};
