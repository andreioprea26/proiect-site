import type { CartLine } from "@/lib/cart/model";

export type CheckoutCartPayloadLine = {
  key: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  customizations: Array<{ id: string; value: string | boolean }>;
};

export function cartLinesToCheckoutPayload(
  lines: CartLine[],
): CheckoutCartPayloadLine[] {
  return lines.map((line) => ({
    key: line.key,
    productId: line.productId,
    variantId: line.variant?.id ?? null,
    quantity: line.quantity,
    customizations: line.customizations.map(({ id, value }) => ({ id, value })),
  }));
}
