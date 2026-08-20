export const PRODUCT_TYPES = [
  "standard",
  "unique",
  "made_to_order",
  "bundle",
] as const;

export const PUBLICATION_STATUSES = ["draft", "published", "archived"] as const;

export const AVAILABILITY_STATUSES = [
  "in_stock",
  "low_stock",
  "made_to_order",
  "unique",
  "unavailable",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type TaxonomyRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  product_type: ProductType;
  publication_status: PublicationStatus;
  availability_status: AvailabilityStatus;
  is_customizable: boolean;
  lead_time_days: number | null;
  updated_at: string;
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  standard: "Standard",
  unique: "Unicat",
  made_to_order: "Realizat la comandă",
  bundle: "Pachet",
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: "Ciornă",
  published: "Publicat",
  archived: "Arhivat",
};

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "În stoc",
  low_stock: "Stoc redus",
  made_to_order: "Realizat la comandă",
  unique: "Unicat",
  unavailable: "Indisponibil",
};
