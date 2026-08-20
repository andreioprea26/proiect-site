export const CUSTOMIZATION_TYPES = ["selection", "text", "boolean", "image"] as const;

export type CustomizationType = (typeof CUSTOMIZATION_TYPES)[number];

export type ProductVariantRecord = {
  id: string;
  product_id: string;
  title: string;
  attributes: Record<string, string>;
  price_override: number | null;
  sku: string | null;
  is_active: boolean;
  display_order: number;
};

export type CustomizationOptionRecord = {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  option_type: CustomizationType;
  is_required: boolean;
  additional_cost: number;
  configuration: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
};

export type ProductImageRecord = {
  id: string;
  product_id: string;
  storage_path: string;
  display_order: number;
  alt_text: string | null;
  public_url: string;
};

export type InventoryRecord = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  low_stock_threshold: number | null;
};

export type InventoryMovementRecord = {
  id: string;
  inventory_id: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
};

export const CUSTOMIZATION_TYPE_LABELS: Record<CustomizationType, string> = {
  selection: "Selecție",
  text: "Text",
  boolean: "Da/Nu",
  image: "Imagine de referință",
};
