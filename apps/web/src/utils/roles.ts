export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  DEVELOPER: 'DEVELOPER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

const FALLBACK_ROLE: UserRole = USER_ROLES.DEVELOPER;

export function resolvePrimaryRole(roles?: string[]): UserRole {
  if (roles?.includes(USER_ROLES.SUPER_ADMIN)) {
    return USER_ROLES.SUPER_ADMIN;
  }
  if (roles?.includes(USER_ROLES.TENANT_ADMIN)) {
    return USER_ROLES.TENANT_ADMIN;
  }
  if (roles?.includes(USER_ROLES.DEVELOPER)) {
    return USER_ROLES.DEVELOPER;
  }
  return FALLBACK_ROLE;
}

export function isRoleAllowed(userRole: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(userRole);
}
