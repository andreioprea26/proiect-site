import {
  AVAILABILITY_STATUSES,
  PRODUCT_TYPES,
  type AvailabilityStatus,
  type ProductType,
} from "@/lib/admin/catalog";

export const SHOP_RESULTS_LIMIT = 120;

export const SHOP_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
] as const;

export type ShopSort = (typeof SHOP_SORTS)[number];

export type ShopFilters = {
  q: string;
  category: string | null;
  collection: string | null;
  productType: ProductType | null;
  availability: AvailabilityStatus | null;
  customizable: boolean | null;
  sort: ShopSort;
};

export type ShopSearchParams = Record<
  string,
  string | string[] | undefined
>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function validSlug(value: string) {
  return value && value.length <= 180 && SLUG_PATTERN.test(value)
    ? value
    : null;
}

export function parseShopFilters(params: ShopSearchParams): ShopFilters {
  const rawQuery = singleValue(params.q)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
  const productType = singleValue(params.type);
  const availability = singleValue(params.availability);
  const customizable = singleValue(params.customizable);
  const sort = singleValue(params.sort);

  return {
    q: rawQuery,
    category: validSlug(singleValue(params.category)),
    collection: validSlug(singleValue(params.collection)),
    productType: PRODUCT_TYPES.some((value) => value === productType)
      ? (productType as ProductType)
      : null,
    availability: AVAILABILITY_STATUSES.some(
      (value) => value === availability,
    )
      ? (availability as AvailabilityStatus)
      : null,
    customizable:
      customizable === "true"
        ? true
        : customizable === "false"
          ? false
          : null,
    sort: SHOP_SORTS.some((value) => value === sort)
      ? (sort as ShopSort)
      : "newest",
  };
}
