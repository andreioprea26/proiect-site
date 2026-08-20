import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireAdminContext() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    redirect("/login");
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");

  if (roleError || !isAdmin) {
    redirect("/");
  }

  return { supabase, user: authData.user };
}
