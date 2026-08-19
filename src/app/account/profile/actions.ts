"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/server";
import {
  nullable,
  ProfileField,
  readProfileFields,
  validateProfileFields,
} from "@/lib/account/validation";

export type ProfileActionState = {
  fieldErrors: Partial<Record<ProfileField, string>>;
  message: string | null;
  success: boolean;
};

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const fields = readProfileFields(formData);
  const fieldErrors = validateProfileFields(fields);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const context = await getAccountContext();
  if (!context) redirect("/login");

  const { data, error } = await context.supabase
    .from("profiles")
    .update({
      first_name: nullable(fields.firstName),
      last_name: nullable(fields.lastName),
      phone: nullable(fields.phone),
    })
    .eq("id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      fieldErrors: {},
      message: "Profilul nu a putut fi actualizat. Încearcă din nou.",
      success: false,
    };
  }

  revalidatePath("/account/profile");
  return { fieldErrors: {}, message: "Profilul a fost actualizat.", success: true };
}
