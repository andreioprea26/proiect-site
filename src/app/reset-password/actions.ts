"use server";

import { redirect } from "next/navigation";

import {
  isRecoveryClaim,
  PasswordResetActionState,
  validatePasswordResetFields,
} from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";

const INVALID_RECOVERY_MESSAGE =
  "Linkul de resetare este invalid sau a expirat. Solicită un link nou.";

export async function updatePassword(
  _previousState: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  const fields = {
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const fieldErrors = validatePasswordResetFields(fields);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, kind: "error", message: null };
  }

  let passwordWasUpdated = false;

  try {
    const supabase = await createClient();
    const [claimsResult, userResult] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.auth.getUser(),
    ]);

    if (
      claimsResult.error ||
      !claimsResult.data ||
      !isRecoveryClaim(claimsResult.data.claims) ||
      userResult.error ||
      !userResult.data.user ||
      claimsResult.data.claims.sub !== userResult.data.user.id
    ) {
      return {
        fieldErrors: {},
        kind: "error",
        message: INVALID_RECOVERY_MESSAGE,
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: fields.password,
    });

    if (error) {
      return {
        fieldErrors: {},
        kind: "error",
        message: "Parola nu a putut fi actualizată. Solicită un link nou și încearcă din nou.",
      };
    }

    passwordWasUpdated = true;

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The password change already succeeded. A later visit is still guarded
      // by the recovery claim and Supabase session validation.
    }
  } catch {
    return {
      fieldErrors: {},
      kind: "error",
      message: INVALID_RECOVERY_MESSAGE,
    };
  }

  if (passwordWasUpdated) {
    redirect("/login?passwordReset=success");
  }

  return {
    fieldErrors: {},
    kind: "error",
    message: "Parola nu a putut fi actualizată. Solicită un link nou și încearcă din nou.",
  };
}
