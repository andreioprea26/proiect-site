import "server-only";

import type { AppRole } from "@/lib/auth/roles";
import { normalizeAppRoles, roleListHas } from "@/lib/auth/roles";
import { getAuthenticatedUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns no roles when the visitor is unauthenticated, has no valid role, or
 * the lookup fails. Authorization therefore fails closed without throwing.
 */
export async function getCurrentUserRoles(): Promise<AppRole[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (error) {
      return [];
    }

    return normalizeAppRoles(data);
  } catch {
    return [];
  }
}

export async function hasCurrentUserRole(role: AppRole): Promise<boolean> {
  const roles = await getCurrentUserRoles();

  return roleListHas(roles, role);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  return hasCurrentUserRole("admin");
}
