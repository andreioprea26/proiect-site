"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/server";
import {
  AddressField,
  AddressFields,
  isValidAddressId,
  nullable,
  readAddressFields,
  validateAddressFields,
} from "@/lib/account/validation";

export type AddressActionState = {
  fieldErrors: Partial<Record<AddressField, string>>;
  message: string | null;
  success: boolean;
};

function addressValues(fields: AddressFields) {
  return {
    label: nullable(fields.label),
    recipient_name: fields.recipientName,
    phone: fields.phone,
    address_line_1: fields.addressLine1,
    address_line_2: nullable(fields.addressLine2),
    city: fields.city,
    county: fields.county,
    postal_code: nullable(fields.postalCode),
    country_code: fields.countryCode,
  };
}

function failure(message: string): AddressActionState {
  return { fieldErrors: {}, message, success: false };
}

async function setDefaultAddress(
  context: NonNullable<Awaited<ReturnType<typeof getAccountContext>>>,
  addressId: string,
) {
  const { data: ownedAddress, error: ownershipError } = await context.supabase
    .from("customer_addresses")
    .select("id")
    .eq("id", addressId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (ownershipError || !ownedAddress) return false;

  const { error: clearError } = await context.supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("user_id", context.user.id)
    .neq("id", addressId)
    .eq("is_default", true);

  if (clearError) return false;

  const { data, error } = await context.supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();

  return !error && Boolean(data);
}

export async function createAddress(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const fields = readAddressFields(formData);
  const fieldErrors = validateAddressFields(fields);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const context = await getAccountContext();
  if (!context) redirect("/login");

  const { data, error } = await context.supabase
    .from("customer_addresses")
    .insert({ ...addressValues(fields), user_id: context.user.id, is_default: false })
    .select("id")
    .single();

  if (error || !data) return failure("Adresa nu a putut fi adăugată. Încearcă din nou.");

  if (fields.isDefault && !(await setDefaultAddress(context, data.id))) {
    revalidatePath("/account/addresses");
    return failure("Adresa a fost adăugată, dar nu a putut fi marcată ca implicită.");
  }

  revalidatePath("/account/addresses");
  return { fieldErrors: {}, message: "Adresa a fost adăugată.", success: true };
}

export async function updateAddress(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const addressId = String(formData.get("addressId") ?? "");
  if (!isValidAddressId(addressId)) return failure("Adresa nu a putut fi actualizată.");

  const fields = readAddressFields(formData);
  const fieldErrors = validateAddressFields(fields);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const context = await getAccountContext();
  if (!context) redirect("/login");

  const values = addressValues(fields);
  const updateValues = fields.isDefault
    ? values
    : { ...values, is_default: false };

  const { data, error } = await context.supabase
    .from("customer_addresses")
    .update(updateValues)
    .eq("id", addressId)
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return failure("Adresa nu a putut fi actualizată.");

  if (fields.isDefault && !(await setDefaultAddress(context, addressId))) {
    return failure("Adresa a fost actualizată, dar nu a putut fi marcată ca implicită.");
  }

  revalidatePath("/account/addresses");
  return { fieldErrors: {}, message: "Adresa a fost actualizată.", success: true };
}

export async function deleteAddress(formData: FormData) {
  const addressId = String(formData.get("addressId") ?? "");
  if (!isValidAddressId(addressId)) return;

  const context = await getAccountContext();
  if (!context) redirect("/login");

  await context.supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", context.user.id);

  revalidatePath("/account/addresses");
}
