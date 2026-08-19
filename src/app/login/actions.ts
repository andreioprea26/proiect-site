"use server";

import { redirect } from "next/navigation";

import {
  getLoginErrorMessage,
  LoginActionState,
  validateLoginFields,
} from "@/lib/auth/login";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const fields = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
  const fieldErrors = validateLoginFields(fields);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(fields);

    if (error) {
      return {
        fieldErrors: {},
        message: getLoginErrorMessage(error.code),
      };
    }
  } catch {
    return {
      fieldErrors: {},
      message: getLoginErrorMessage(undefined),
    };
  }

  redirect("/");
}

export async function logout() {
  let logoutFailed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    logoutFailed = Boolean(error);
  } catch {
    logoutFailed = true;
  }

  redirect(logoutFailed ? "/?logout=error" : "/");
}
