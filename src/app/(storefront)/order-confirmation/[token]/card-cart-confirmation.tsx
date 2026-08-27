"use client";

import { useEffect } from "react";

import { CART_STORAGE_KEY } from "@/lib/cart/model";

import { useCart } from "../../_components/cart-provider";

export function CardCartConfirmation({
  confirmationToken,
  paid,
}: {
  confirmationToken: string;
  paid: boolean;
}) {
  const { clearCart, hydrated } = useCart();

  useEffect(() => {
    if (!paid || !hydrated) return;
    const snapshotKey = `brand-handmade:card-checkout:${confirmationToken}`;
    const expectedCart = window.sessionStorage.getItem(snapshotKey);
    const currentCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (expectedCart && currentCart === expectedCart) {
      clearCart();
    }
    window.sessionStorage.removeItem(snapshotKey);
  }, [clearCart, confirmationToken, hydrated, paid]);

  return null;
}
