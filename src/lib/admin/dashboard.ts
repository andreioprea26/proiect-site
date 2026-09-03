import "server-only";

import { requireAdminContext } from "@/lib/admin/server";

export type AdminDashboardData = {
  newOrders: Array<{ id: string; publicNumber: string; createdAt: string }>;
  newOrderCount: number;
  customizationOrders: Array<{ id: string; publicNumber: string; createdAt: string }>;
  customizationCount: number;
  lowStock: Array<{
    inventoryId: string;
    productId: string;
    label: string;
    physicalQuantity: number;
    reservedQuantity: number;
    effectiveAvailable: number;
    threshold: number;
  }>;
  lowStockCount: number;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { supabase } = await requireAdminContext();
  const [newOrdersResult, customizationResult, inventoryResult] = await Promise.all([
    supabase.from("orders").select("id, public_number, created_at", { count: "exact" }).eq("status", "new").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id, public_number, created_at", { count: "exact" }).eq("status", "awaiting_customization_review").order("created_at", { ascending: false }).limit(5),
    supabase.from("inventory").select("id, product_id, variant_id, quantity, low_stock_threshold").not("low_stock_threshold", "is", null),
  ]);
  if (newOrdersResult.error || customizationResult.error || inventoryResult.error) {
    throw new Error("Dashboard-ul operațional nu a putut fi încărcat.");
  }

  const inventories = inventoryResult.data ?? [];
  const inventoryIds = inventories.map((inventory) => inventory.id);
  const reservationResult = inventoryIds.length > 0
    ? await supabase.from("stock_reservations").select("inventory_id, quantity").in("inventory_id", inventoryIds).eq("status", "active").gt("expires_at", new Date().toISOString())
    : { data: [], error: null };
  if (reservationResult.error) throw new Error("Rezervările active nu au putut fi încărcate.");

  const variantIds = inventories.flatMap((inventory) => inventory.variant_id ? [inventory.variant_id] : []);
  const variantsResult = variantIds.length > 0
    ? await supabase.from("product_variants").select("id, product_id, title").in("id", variantIds)
    : { data: [], error: null };
  if (variantsResult.error) throw new Error("Variantele pentru stoc nu au putut fi încărcate.");
  const variants = variantsResult.data ?? [];
  const productIds = new Set(inventories.flatMap((inventory) => inventory.product_id ? [inventory.product_id] : []));
  variants.forEach((variant) => productIds.add(variant.product_id));
  const productsResult = productIds.size > 0
    ? await supabase.from("products").select("id, name").in("id", [...productIds])
    : { data: [], error: null };
  if (productsResult.error) throw new Error("Produsele pentru stoc nu au putut fi încărcate.");

  const reservations = new Map<string, number>();
  for (const reservation of reservationResult.data ?? []) {
    reservations.set(
      reservation.inventory_id,
      (reservations.get(reservation.inventory_id) ?? 0) + reservation.quantity,
    );
  }
  const productNames = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const lowStock = inventories.flatMap((inventory) => {
    const threshold = Number(inventory.low_stock_threshold);
    const reservedQuantity = reservations.get(inventory.id) ?? 0;
    const effectiveAvailable = inventory.quantity - reservedQuantity;
    if (effectiveAvailable > threshold) return [];
    const variant = inventory.variant_id ? variantMap.get(inventory.variant_id) : null;
    const productId = inventory.product_id ?? variant?.product_id;
    if (!productId) return [];
    const productName = productNames.get(productId) ?? "Produs";
    return [{
      inventoryId: inventory.id,
      productId,
      label: variant ? `${productName} · ${variant.title}` : productName,
      physicalQuantity: inventory.quantity,
      reservedQuantity,
      effectiveAvailable,
      threshold,
    }];
  }).sort((a, b) => a.effectiveAvailable - b.effectiveAvailable);

  return {
    newOrders: (newOrdersResult.data ?? []).map((order) => ({ id: order.id, publicNumber: order.public_number, createdAt: order.created_at })),
    newOrderCount: newOrdersResult.count ?? 0,
    customizationOrders: (customizationResult.data ?? []).map((order) => ({ id: order.id, publicNumber: order.public_number, createdAt: order.created_at })),
    customizationCount: customizationResult.count ?? 0,
    lowStock: lowStock.slice(0, 5),
    lowStockCount: lowStock.length,
  };
}
