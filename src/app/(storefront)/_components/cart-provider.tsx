"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addCartLine,
  cartItemCount,
  cartSubtotalMinor,
  CART_STORAGE_KEY,
  type CartLine,
  parseStoredCart,
  serializeCart,
  updateCartLineQuantity,
} from "@/lib/cart/model";

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  itemCount: number;
  subtotalMinor: number;
  addLine: (line: CartLine) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLines(parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY)));
      setHydrated(true);
    });

    function syncCart(event: StorageEvent) {
      if (event.key === CART_STORAGE_KEY) {
        setLines(parseStoredCart(event.newValue));
      }
    }
    window.addEventListener("storage", syncCart);
    return () => {
      active = false;
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
  }, [hydrated, lines]);

  const addLine = useCallback((line: CartLine) => {
    setLines((current) => addCartLine(current, line));
  }, []);
  const updateQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) => updateCartLineQuantity(current, key, quantity));
  }, []);
  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);
  const clearCart = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      hydrated,
      itemCount: cartItemCount(lines),
      subtotalMinor: cartSubtotalMinor(lines),
      addLine,
      updateQuantity,
      removeLine,
      clearCart,
    }),
    [
      addLine,
      clearCart,
      hydrated,
      lines,
      removeLine,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart trebuie folosit în interiorul CartProvider.");
  }
  return context;
}
