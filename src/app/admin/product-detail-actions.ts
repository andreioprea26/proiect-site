"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { isValidUuid } from "@/lib/admin/catalog-validation";
import {
  type DetailActionState,
  extensionForImageType,
  readCustomizationFields,
  readInventoryFields,
  readVariantFields,
  validateAdjustment,
  validateAltText,
  validateCustomizationFields,
  validateImageFile,
  validateThreshold,
  validateVariantFields,
} from "@/lib/admin/product-details-validation";
import { requireAdminContext } from "@/lib/admin/server";

type AdminClient = Awaited<ReturnType<typeof requireAdminContext>>["supabase"];

function failure(message: string, fieldErrors: Record<string, string> = {}): DetailActionState {
  return { fieldErrors, message, success: false };
}

function success(message: string): DetailActionState {
  return { fieldErrors: {}, message, success: true };
}

function revalidateProduct(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

async function productExists(supabase: AdminClient, productId: string) {
  if (!isValidUuid(productId)) return false;
  const { data, error } = await supabase.from("products").select("id").eq("id", productId).maybeSingle();
  return !error && Boolean(data);
}

function catalogDatabaseFailure(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === "23505") return failure("Există deja o înregistrare cu aceleași date unice.");
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("direct inventory")) {
    return failure("Produsul are inventar direct și nu poate primi variante.");
  }
  return failure(fallback);
}

export async function createVariant(
  productId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  void _previousState;
  const { supabase } = await requireAdminContext();
  if (!(await productExists(supabase, productId))) return failure("Produsul nu este valid.");

  const fields = readVariantFields(formData);
  const fieldErrors = validateVariantFields(formData, fields);
  if (Object.keys(fieldErrors).length > 0) return failure("Verifică datele variantei.", fieldErrors);

  const { error } = await supabase.from("product_variants").insert({
    product_id: productId,
    title: fields.title,
    attributes: fields.attributes,
    price_override: fields.priceOverride || null,
    sku: fields.sku || null,
    is_active: fields.isActive,
    display_order: Number(fields.displayOrder),
  });

  if (error) return catalogDatabaseFailure(error, "Varianta nu a putut fi creată.");
  revalidateProduct(productId);
  return success("Varianta a fost creată.");
}

export async function updateVariant(
  productId: string,
  variantId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(variantId) || !(await productExists(supabase, productId))) {
    return failure("Varianta nu este validă.");
  }

  const fields = readVariantFields(formData);
  const fieldErrors = validateVariantFields(formData, fields);
  if (Object.keys(fieldErrors).length > 0) return failure("Verifică datele variantei.", fieldErrors);

  const { data, error } = await supabase
    .from("product_variants")
    .update({
      title: fields.title,
      attributes: fields.attributes,
      price_override: fields.priceOverride || null,
      sku: fields.sku || null,
      is_active: fields.isActive,
      display_order: Number(fields.displayOrder),
    })
    .eq("id", variantId)
    .eq("product_id", productId)
    .select("id")
    .maybeSingle();

  if (error) return catalogDatabaseFailure(error, "Varianta nu a putut fi actualizată.");
  if (!data) return failure("Varianta nu mai există.");
  revalidateProduct(productId);
  return success("Varianta a fost actualizată.");
}

export async function deleteVariant(
  productId: string,
  variantId: string,
  _previousState: DetailActionState,
): Promise<DetailActionState> {
  void _previousState;
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(productId) || !isValidUuid(variantId)) return failure("Varianta nu este validă.");

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!variant) return failure("Varianta nu mai există.");

  const { data: inventory } = await supabase
    .from("inventory")
    .select("id")
    .eq("variant_id", variantId)
    .maybeSingle();
  if (inventory) return failure("Varianta are inventar sau istoric. Dezactiveaz-o în loc să o ștergi.");

  const { error } = await supabase.from("product_variants").delete().eq("id", variantId).eq("product_id", productId);
  if (error) return failure("Varianta nu a putut fi ștearsă.");
  revalidateProduct(productId);
  return success("Varianta a fost ștearsă.");
}

export async function createCustomization(
  productId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!(await productExists(supabase, productId))) return failure("Produsul nu este valid.");

  const fields = readCustomizationFields(formData);
  const fieldErrors = validateCustomizationFields(formData, fields);
  if (Object.keys(fieldErrors).length > 0) return failure("Verifică opțiunea de personalizare.", fieldErrors);

  const { error } = await supabase.from("customization_options").insert({
    product_id: productId,
    name: fields.name,
    description: fields.description || null,
    option_type: fields.optionType,
    is_required: fields.isRequired,
    additional_cost: fields.additionalCost,
    configuration: fields.configuration,
    display_order: Number(fields.displayOrder),
    is_active: fields.isActive,
  });

  if (error) return catalogDatabaseFailure(error, "Opțiunea nu a putut fi creată.");
  revalidateProduct(productId);
  return success("Opțiunea de personalizare a fost creată.");
}

export async function updateCustomization(
  productId: string,
  optionId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(optionId) || !(await productExists(supabase, productId))) {
    return failure("Opțiunea nu este validă.");
  }

  const fields = readCustomizationFields(formData);
  const fieldErrors = validateCustomizationFields(formData, fields);
  if (Object.keys(fieldErrors).length > 0) return failure("Verifică opțiunea de personalizare.", fieldErrors);

  const { data, error } = await supabase
    .from("customization_options")
    .update({
      name: fields.name,
      description: fields.description || null,
      option_type: fields.optionType,
      is_required: fields.isRequired,
      additional_cost: fields.additionalCost,
      configuration: fields.configuration,
      display_order: Number(fields.displayOrder),
      is_active: fields.isActive,
    })
    .eq("id", optionId)
    .eq("product_id", productId)
    .select("id")
    .maybeSingle();

  if (error) return catalogDatabaseFailure(error, "Opțiunea nu a putut fi actualizată.");
  if (!data) return failure("Opțiunea nu mai există.");
  revalidateProduct(productId);
  return success("Opțiunea de personalizare a fost actualizată.");
}

export async function deleteCustomization(
  productId: string,
  optionId: string,
  _previousState: DetailActionState,
): Promise<DetailActionState> {
  void _previousState;
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(productId) || !isValidUuid(optionId)) return failure("Opțiunea nu este validă.");

  const { data, error } = await supabase
    .from("customization_options")
    .delete()
    .eq("id", optionId)
    .eq("product_id", productId)
    .select("id")
    .maybeSingle();
  if (error) return failure("Opțiunea nu a putut fi ștearsă.");
  if (!data) return failure("Opțiunea nu mai există.");
  revalidateProduct(productId);
  return success("Opțiunea a fost ștearsă.");
}

export async function uploadProductImage(
  productId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!(await productExists(supabase, productId))) return failure("Produsul nu este valid.");

  const file = formData.get("image");
  const altText = String(formData.get("altText") ?? "").trim();
  if (!(file instanceof File)) return failure("Selectează o imagine.", { image: "Fișierul lipsește." });
  const fileError = validateImageFile(file);
  const altError = validateAltText(altText);
  if (fileError || altError) {
    return failure("Imaginea nu este validă.", {
      ...(fileError ? { image: fileError } : {}),
      ...(altError ? { altText: altError } : {}),
    });
  }

  const { data: lastImage, error: orderError } = await supabase
    .from("product_images")
    .select("display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError || (lastImage && lastImage.display_order >= 2_147_483_647)) {
    return failure("Ordinea imaginilor nu a putut fi determinată.");
  }

  const storagePath = `${productId}/${randomUUID()}.${extensionForImageType(file.type)}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(storagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (uploadError) return failure("Imaginea nu a putut fi încărcată în Storage.");

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    display_order: (lastImage?.display_order ?? -1) + 1,
    alt_text: altText || null,
  });
  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from("product-images").remove([storagePath]);
    return failure(
      cleanupError
        ? "Înregistrarea imaginii a eșuat, iar fișierul nu a putut fi curățat automat din Storage."
        : "Înregistrarea imaginii a eșuat; fișierul încărcat a fost curățat.",
    );
  }

  revalidateProduct(productId);
  return success("Imaginea a fost încărcată.");
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(productId) || !isValidUuid(imageId)) return failure("Imaginea nu este validă.");
  const altText = String(formData.get("altText") ?? "").trim();
  const altError = validateAltText(altText);
  if (altError) return failure("Verifică textul alternativ.", { altText: altError });

  const { data, error } = await supabase
    .from("product_images")
    .update({ alt_text: altText || null })
    .eq("id", imageId)
    .eq("product_id", productId)
    .select("id")
    .maybeSingle();
  if (error || !data) return failure("Textul alternativ nu a putut fi actualizat.");
  revalidateProduct(productId);
  return success("Textul alternativ a fost actualizat.");
}

export async function moveProductImage(
  productId: string,
  imageId: string,
  direction: "up" | "down",
  _previousState: DetailActionState,
): Promise<DetailActionState> {
  void _previousState;
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(productId) || !isValidUuid(imageId) || !["up", "down"].includes(direction)) {
    return failure("Mutarea imaginii nu este validă.");
  }

  const { data: images, error } = await supabase
    .from("product_images")
    .select("id, display_order")
    .eq("product_id", productId)
    .order("display_order");
  if (error) return failure("Ordinea imaginilor nu a putut fi încărcată.");

  const index = images.findIndex((image) => image.id === imageId);
  const adjacentIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || adjacentIndex < 0 || adjacentIndex >= images.length) {
    return failure("Imaginea este deja la limita listei.");
  }

  const current = images[index];
  const adjacent = images[adjacentIndex];
  const maxOrder = images.at(-1)?.display_order ?? 0;
  if (maxOrder >= 2_147_483_647) return failure("Ordinea imaginilor nu mai poate fi modificată în siguranță.");
  const temporaryOrder = maxOrder + 1;

  const first = await supabase.from("product_images").update({ display_order: temporaryOrder }).eq("id", current.id).eq("product_id", productId);
  if (first.error) return failure("Imaginea nu a putut fi mutată.");
  const second = await supabase.from("product_images").update({ display_order: current.display_order }).eq("id", adjacent.id).eq("product_id", productId);
  if (second.error) {
    await supabase.from("product_images").update({ display_order: current.display_order }).eq("id", current.id);
    return failure("Imaginea nu a putut fi mutată; ordinea inițială a fost restaurată.");
  }
  const third = await supabase.from("product_images").update({ display_order: adjacent.display_order }).eq("id", current.id).eq("product_id", productId);
  if (third.error) {
    await supabase.from("product_images").update({ display_order: adjacent.display_order }).eq("id", adjacent.id);
    await supabase.from("product_images").update({ display_order: current.display_order }).eq("id", current.id);
    return failure("Imaginea nu a putut fi mutată; ordinea inițială a fost restaurată.");
  }

  revalidateProduct(productId);
  return success("Ordinea imaginilor a fost actualizată.");
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
  _previousState: DetailActionState,
): Promise<DetailActionState> {
  void _previousState;
  const { supabase } = await requireAdminContext();
  if (!isValidUuid(productId) || !isValidUuid(imageId)) return failure("Imaginea nu este validă.");

  const { data: image, error: readError } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, display_order, alt_text")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();
  if (readError || !image) return failure("Imaginea nu mai există.");

  const { error: deleteRowError } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
  if (deleteRowError) return failure("Înregistrarea imaginii nu a putut fi ștearsă.");

  const { error: storageError } = await supabase.storage.from("product-images").remove([image.storage_path]);
  if (storageError) {
    const { error: restoreError } = await supabase.from("product_images").insert(image);
    return failure(
      restoreError
        ? "Ștergerea fișierului a eșuat, iar înregistrarea DB nu a putut fi restaurată. Este necesară curățare manuală."
        : "Ștergerea din Storage a eșuat; înregistrarea DB a fost restaurată.",
    );
  }

  revalidateProduct(productId);
  return success("Imaginea a fost ștearsă.");
}

async function inventoryBelongsToProduct(supabase: AdminClient, productId: string, inventoryId: string) {
  if (!isValidUuid(productId) || !isValidUuid(inventoryId)) return false;
  const { data: inventory } = await supabase
    .from("inventory")
    .select("product_id, variant_id")
    .eq("id", inventoryId)
    .maybeSingle();
  if (!inventory) return false;
  if (inventory.product_id) return inventory.product_id === productId;
  if (!inventory.variant_id) return false;
  const { data: variant } = await supabase
    .from("product_variants")
    .select("product_id")
    .eq("id", inventory.variant_id)
    .maybeSingle();
  return variant?.product_id === productId;
}

export async function initializeInventory(
  productId: string,
  variantId: string | null,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!(await productExists(supabase, productId)) || (variantId !== null && !isValidUuid(variantId))) {
    return failure("Ținta inventarului nu este validă.");
  }

  const { threshold } = readInventoryFields(formData);
  const thresholdError = validateThreshold(threshold);
  if (thresholdError) return failure("Pragul nu este valid.", { threshold: thresholdError });

  if (variantId) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (!variant) return failure("Varianta nu aparține produsului.");
  } else {
    const { count } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    if ((count ?? 0) > 0) return failure("Produsele cu variante folosesc inventar separat pentru fiecare variantă.");
  }

  const { error } = await supabase.from("inventory").insert({
    product_id: variantId ? null : productId,
    variant_id: variantId,
    quantity: 0,
    low_stock_threshold: threshold ? Number(threshold) : null,
  });
  if (error) return failure("Inventarul nu a putut fi inițializat. Verifică dacă există deja sau dacă ținta este permisă.");
  revalidateProduct(productId);
  return success("Inventarul a fost inițializat cu cantitatea 0.");
}

export async function updateInventoryThreshold(
  productId: string,
  inventoryId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase } = await requireAdminContext();
  if (!(await inventoryBelongsToProduct(supabase, productId, inventoryId))) return failure("Inventarul nu este valid.");
  const { threshold } = readInventoryFields(formData);
  const thresholdError = validateThreshold(threshold);
  if (thresholdError) return failure("Pragul nu este valid.", { threshold: thresholdError });

  const { error } = await supabase
    .from("inventory")
    .update({ low_stock_threshold: threshold ? Number(threshold) : null })
    .eq("id", inventoryId);
  if (error) return failure("Pragul de stoc nu a putut fi actualizat.");
  revalidateProduct(productId);
  return success("Pragul de stoc a fost actualizat.");
}

function inventoryRpcFailure(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("negative")) return failure("Ajustarea ar produce stoc negativ și a fost refuzată.");
  if (message.includes("unique product") || message.includes("above 1")) {
    return failure("Un produs unicat nu poate avea stoc total mai mare de 1.");
  }
  return failure("Ajustarea a fost refuzată de baza de date.");
}

export async function adjustInventory(
  productId: string,
  inventoryId: string,
  _previousState: DetailActionState,
  formData: FormData,
): Promise<DetailActionState> {
  const { supabase, user } = await requireAdminContext();
  if (!(await inventoryBelongsToProduct(supabase, productId, inventoryId))) return failure("Inventarul nu este valid.");

  const { delta, reason } = readInventoryFields(formData);
  const fieldErrors = validateAdjustment(delta, reason);
  if (Object.keys(fieldErrors).length > 0) return failure("Verifică ajustarea de stoc.", fieldErrors);

  const { error } = await supabase.rpc("adjust_inventory", {
    p_inventory_id: inventoryId,
    p_quantity_delta: Number(delta),
    p_reason: reason || null,
    p_actor_user_id: user.id,
    p_context: { source: "admin_product_editor", product_id: productId },
  });
  if (error) return inventoryRpcFailure(error);
  revalidateProduct(productId);
  return success("Stocul a fost ajustat și mișcarea a fost înregistrată.");
}
