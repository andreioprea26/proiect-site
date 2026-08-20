"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminContext } from "@/lib/admin/server";
import {
  CatalogActionState,
  isValidUuid,
  nullable,
  readProductFields,
  readTaxonomyFields,
  validateProductFields,
  validateTaxonomyFields,
} from "@/lib/admin/catalog-validation";

type TaxonomyTable = "categories" | "collections";

function failure(message: string): CatalogActionState {
  return { fieldErrors: {}, message, success: false };
}

function databaseFailure(error: { code?: string } | null, fallback: string) {
  return failure(error?.code === "23505" ? "Slug-ul este deja folosit." : fallback);
}

function taxonomyPath(table: TaxonomyTable) {
  return table === "categories" ? "/admin/categories" : "/admin/collections";
}

async function createTaxonomy(
  table: TaxonomyTable,
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const fields = readTaxonomyFields(formData);
  const fieldErrors = validateTaxonomyFields(fields);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const { supabase } = await requireAdminContext();
  const { error } = await supabase.from(table).insert({
    name: fields.name,
    slug: fields.slug,
    description: nullable(fields.description),
  });

  if (error) return databaseFailure(error, "Înregistrarea nu a putut fi adăugată.");

  revalidatePath(taxonomyPath(table));
  revalidatePath("/admin/products");
  return { fieldErrors: {}, message: "Înregistrarea a fost adăugată.", success: true };
}

async function updateTaxonomy(
  table: TaxonomyTable,
  id: string,
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!isValidUuid(id)) return failure("Înregistrarea nu este validă.");

  const fields = readTaxonomyFields(formData);
  const fieldErrors = validateTaxonomyFields(fields);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase
    .from(table)
    .update({
      name: fields.name,
      slug: fields.slug,
      description: nullable(fields.description),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return databaseFailure(error, "Înregistrarea nu a putut fi actualizată.");
  if (!data) return failure("Înregistrarea nu mai există.");

  revalidatePath(taxonomyPath(table));
  revalidatePath("/admin/products");
  return { fieldErrors: {}, message: "Modificările au fost salvate.", success: true };
}

async function deleteTaxonomy(table: TaxonomyTable, id: string) {
  if (!isValidUuid(id)) return;

  const { supabase } = await requireAdminContext();
  await supabase.from(table).delete().eq("id", id);
  revalidatePath(taxonomyPath(table));
  revalidatePath("/admin/products");
}

export async function createCategory(previousState: CatalogActionState, formData: FormData) {
  return createTaxonomy("categories", previousState, formData);
}

export async function updateCategory(
  id: string,
  previousState: CatalogActionState,
  formData: FormData,
) {
  return updateTaxonomy("categories", id, previousState, formData);
}

export async function deleteCategory(id: string) {
  return deleteTaxonomy("categories", id);
}

export async function createCollection(previousState: CatalogActionState, formData: FormData) {
  return createTaxonomy("collections", previousState, formData);
}

export async function updateCollection(
  id: string,
  previousState: CatalogActionState,
  formData: FormData,
) {
  return updateTaxonomy("collections", id, previousState, formData);
}

export async function deleteCollection(id: string) {
  return deleteTaxonomy("collections", id);
}

function productValues(fields: ReturnType<typeof readProductFields>) {
  return {
    name: fields.name,
    slug: fields.slug,
    description: nullable(fields.description),
    base_price: fields.basePrice,
    product_type: fields.productType,
    publication_status: fields.publicationStatus,
    availability_status: fields.availabilityStatus,
    is_customizable: fields.isCustomizable,
    lead_time_days: fields.leadTimeDays ? Number(fields.leadTimeDays) : null,
  };
}

async function selectionsExist(
  supabase: Awaited<ReturnType<typeof requireAdminContext>>["supabase"],
  table: TaxonomyTable,
  ids: string[],
) {
  if (ids.length === 0) return true;
  const { data, error } = await supabase.from(table).select("id").in("id", ids);
  return !error && data.length === ids.length;
}

async function validateSelections(
  supabase: Awaited<ReturnType<typeof requireAdminContext>>["supabase"],
  categoryIds: string[],
  collectionIds: string[],
) {
  const [categoriesValid, collectionsValid] = await Promise.all([
    selectionsExist(supabase, "categories", categoryIds),
    selectionsExist(supabase, "collections", collectionIds),
  ]);
  return categoriesValid && collectionsValid;
}

async function insertRelationships(
  supabase: Awaited<ReturnType<typeof requireAdminContext>>["supabase"],
  productId: string,
  categoryIds: string[],
  collectionIds: string[],
) {
  if (categoryIds.length > 0) {
    const { error } = await supabase.from("product_categories").insert(
      categoryIds.map((categoryId) => ({ product_id: productId, category_id: categoryId })),
    );
    if (error) return false;
  }

  if (collectionIds.length > 0) {
    const { error } = await supabase.from("product_collections").insert(
      collectionIds.map((collectionId) => ({ product_id: productId, collection_id: collectionId })),
    );
    if (error) return false;
  }

  return true;
}

export async function createProduct(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const fields = readProductFields(formData);
  const fieldErrors = validateProductFields(fields);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const { supabase } = await requireAdminContext();
  if (!(await validateSelections(supabase, fields.categoryIds, fields.collectionIds))) {
    return failure("Selecția de categorii sau colecții nu mai este disponibilă.");
  }

  const { data, error } = await supabase
    .from("products")
    .insert(productValues(fields))
    .select("id")
    .single();

  if (error || !data) return databaseFailure(error, "Produsul nu a putut fi creat.");

  const relationshipsSaved = await insertRelationships(
    supabase,
    data.id,
    fields.categoryIds,
    fields.collectionIds,
  );
  if (!relationshipsSaved) {
    await supabase.from("products").delete().eq("id", data.id);
    return failure("Produsul nu a putut fi creat împreună cu asocierile sale.");
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data.id}?created=1`);
}

async function replaceRelationships(
  supabase: Awaited<ReturnType<typeof requireAdminContext>>["supabase"],
  productId: string,
  categoryIds: string[],
  collectionIds: string[],
) {
  const [categoryResult, collectionResult] = await Promise.all([
    supabase.from("product_categories").select("category_id").eq("product_id", productId),
    supabase.from("product_collections").select("collection_id").eq("product_id", productId),
  ]);
  if (categoryResult.error || collectionResult.error) return false;

  const currentCategoryIds = categoryResult.data.map((item) => item.category_id);
  const currentCollectionIds = collectionResult.data.map((item) => item.collection_id);
  const categoriesToAdd = categoryIds.filter((id) => !currentCategoryIds.includes(id));
  const collectionsToAdd = collectionIds.filter((id) => !currentCollectionIds.includes(id));
  const categoriesToRemove = currentCategoryIds.filter((id) => !categoryIds.includes(id));
  const collectionsToRemove = currentCollectionIds.filter((id) => !collectionIds.includes(id));

  const rollbackAdditions = async () => {
    if (categoriesToAdd.length > 0) {
      await supabase.from("product_categories").delete().eq("product_id", productId).in("category_id", categoriesToAdd);
    }
    if (collectionsToAdd.length > 0) {
      await supabase.from("product_collections").delete().eq("product_id", productId).in("collection_id", collectionsToAdd);
    }
  };

  if (!(await insertRelationships(supabase, productId, categoriesToAdd, collectionsToAdd))) {
    await rollbackAdditions();
    return false;
  }

  if (categoriesToRemove.length > 0) {
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", productId)
      .in("category_id", categoriesToRemove);
    if (error) {
      await rollbackAdditions();
      return false;
    }
  }

  if (collectionsToRemove.length > 0) {
    const { error } = await supabase
      .from("product_collections")
      .delete()
      .eq("product_id", productId)
      .in("collection_id", collectionsToRemove);
    if (error) {
      if (categoriesToRemove.length > 0) {
        await supabase.from("product_categories").insert(
          categoriesToRemove.map((categoryId) => ({ product_id: productId, category_id: categoryId })),
        );
      }
      await rollbackAdditions();
      return false;
    }
  }

  return true;
}

export async function updateProduct(
  productId: string,
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  if (!isValidUuid(productId)) return failure("Produsul nu este valid.");

  const fields = readProductFields(formData);
  const fieldErrors = validateProductFields(fields);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null, success: false };
  }

  const { supabase } = await requireAdminContext();
  if (!(await validateSelections(supabase, fields.categoryIds, fields.collectionIds))) {
    return failure("Selecția de categorii sau colecții nu mai este disponibilă.");
  }

  const { data: existingProduct, error: existingProductError } = await supabase
    .from("products")
    .select("name, slug, description, base_price, product_type, publication_status, availability_status, is_customizable, lead_time_days")
    .eq("id", productId)
    .maybeSingle();
  if (existingProductError || !existingProduct) return failure("Produsul nu mai există.");

  const { data, error } = await supabase
    .from("products")
    .update(productValues(fields))
    .eq("id", productId)
    .select("id")
    .maybeSingle();

  if (error) return databaseFailure(error, "Produsul nu a putut fi actualizat.");
  if (!data) return failure("Produsul nu mai există.");

  if (!(await replaceRelationships(supabase, productId, fields.categoryIds, fields.collectionIds))) {
    await supabase.from("products").update(existingProduct).eq("id", productId);
    return failure("Actualizarea nu a putut fi finalizată; datele produsului au fost restaurate.");
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { fieldErrors: {}, message: "Produsul a fost actualizat.", success: true };
}

export async function archiveProduct(productId: string) {
  if (!isValidUuid(productId)) return;

  const { supabase } = await requireAdminContext();
  await supabase
    .from("products")
    .update({ publication_status: "archived", availability_status: "unavailable" })
    .eq("id", productId);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
}
