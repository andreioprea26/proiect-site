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
  stats: {
    periodDays: number;
    recentOrderCount: number;
    attentionOrderCount: number;
    ordersByStatus: Record<string, number>;
    stripeCollectedGrossMinor: number;
    codCollectedMinor: number;
    successfulRefundsMinor: number;
    stripeCollectedNetMinor: number;
    pendingReviewCount: number;
    newContactCount: number;
    newCustomRequestCount: number;
    activeSubscriberCount: number;
    currency: string;
  };
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { supabase } = await requireAdminContext();
  const periodDays = 30;
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const [newOrdersResult, customizationResult, inventoryResult, statsResult] = await Promise.all([
    supabase.from("orders").select("id, public_number, created_at", { count: "exact" }).eq("status", "new").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id, public_number, created_at", { count: "exact" }).eq("status", "awaiting_customization_review").order("created_at", { ascending: false }).limit(5),
    supabase.from("inventory").select("id, product_id, variant_id, quantity, low_stock_threshold").not("low_stock_threshold", "is", null),
    supabase.rpc("get_admin_dashboard_stats", { p_since: since }),
  ]);
  if (newOrdersResult.error || customizationResult.error || inventoryResult.error || statsResult.error) {
    throw new Error("Dashboard-ul operațional nu a putut fi încărcat.");
  }
  const rawStats = statsResult.data as Record<string, unknown> | null;
  if (!rawStats || rawStats.success !== true) throw new Error("Statisticile administrative nu au putut fi încărcate.");

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
    stats: {
      periodDays,
      recentOrderCount: numberValue(rawStats.recentOrderCount),
      attentionOrderCount: numberValue(rawStats.attentionOrderCount),
      ordersByStatus: numberRecord(rawStats.ordersByStatus),
      stripeCollectedGrossMinor: numberValue(rawStats.stripeCollectedGrossMinor),
      codCollectedMinor: numberValue(rawStats.codCollectedMinor),
      successfulRefundsMinor: numberValue(rawStats.successfulRefundsMinor),
      stripeCollectedNetMinor: numberValue(rawStats.stripeCollectedNetMinor),
      pendingReviewCount: numberValue(rawStats.pendingReviewCount),
      newContactCount: numberValue(rawStats.newContactCount),
      newCustomRequestCount: numberValue(rawStats.newCustomRequestCount),
      activeSubscriberCount: numberValue(rawStats.activeSubscriberCount),
      currency: typeof rawStats.currency === "string" ? rawStats.currency : "RON",
    },
  };
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, count]) => [key, numberValue(count)]),
  );
}
