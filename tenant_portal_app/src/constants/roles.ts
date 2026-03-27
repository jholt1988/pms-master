export const ROLES = {
  TENANT: 'TENANT',
  PM: 'PROPERTY_MANAGER',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
