export const ROLES = {
  TENANT: 'TENANT',
  PM: 'PM',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
