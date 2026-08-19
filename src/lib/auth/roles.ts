export const APP_ROLES = ["customer", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

type RoleRecord = {
  role: unknown;
};

export function isAppRole(value: unknown): value is AppRole {
  return APP_ROLES.some((role) => role === value);
}

export function normalizeAppRoles(
  records: readonly RoleRecord[] | null | undefined,
): AppRole[] {
  if (!records) {
    return [];
  }

  const roles = new Set<AppRole>();

  records.forEach(({ role }) => {
    if (isAppRole(role)) {
      roles.add(role);
    }
  });

  return APP_ROLES.filter((role) => roles.has(role));
}

export function roleListHas(
  roles: readonly AppRole[],
  role: unknown,
): boolean {
  return isAppRole(role) && roles.includes(role);
}
