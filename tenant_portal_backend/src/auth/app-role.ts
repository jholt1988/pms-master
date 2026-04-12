import { Role } from '@prisma/client';

export type CanonicalAppRole = Role;

const ROLE_MAP: Record<string, CanonicalAppRole> = {
  admin: Role.ADMIN,
  administrator: Role.ADMIN,
  owner: Role.OWNER,
  property_manager: Role.PROPERTY_MANAGER,
  'property-manager': Role.PROPERTY_MANAGER,
  'property manager': Role.PROPERTY_MANAGER,
  propertymanager: Role.PROPERTY_MANAGER,
  property_managers: Role.PROPERTY_MANAGER,
  pm: Role.PROPERTY_MANAGER,
  leasing: Role.PROPERTY_MANAGER,
  maintenance: Role.PROPERTY_MANAGER,
  operator: Role.PROPERTY_MANAGER,
  tenant: Role.TENANT,
};

export function normalizeAppRole(role: string | null | undefined): CanonicalAppRole {
  const normalized = String(role ?? '').trim();
  return ROLE_MAP[normalized.toLowerCase()] ?? ((Role as Record<string, CanonicalAppRole>)[normalized.toUpperCase()] ?? Role.PROPERTY_MANAGER);
}

export function roleAliasesForQuery(role: CanonicalAppRole): string[] {
  const aliases = new Set<string>([role, role.toLowerCase()]);

  if (role === Role.PROPERTY_MANAGER || role === Role.ADMIN) {
    aliases.add('pm');
    aliases.add('property manager');
    aliases.add('property-manager');
    aliases.add('propertymanager');
    aliases.add('property_managers');
    aliases.add('leasing');
    aliases.add('maintenance');
    aliases.add('operator');
    aliases.add('LEASING');
    aliases.add('MAINTENANCE');
    aliases.add('OPERATOR');
  }

  if (role === Role.ADMIN) {
    aliases.add(Role.PROPERTY_MANAGER);
    aliases.add(Role.OWNER);
  }

  return [...aliases];
}
