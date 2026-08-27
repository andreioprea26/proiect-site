import type { Metadata } from "next";

import { getCheckoutPageData } from "@/lib/checkout/server";

import { CheckoutForm } from "../_components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | Brand Handmade",
  description: "Verifică datele de contact, livrare și produsele din coș.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const { prefill, shippingMethods } = await getCheckoutPageData();
  const idempotencyKey = crypto.randomUUID();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Checkout sigur
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Date pentru comandă
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          Completează datele, apoi verificăm pe server prețurile,
          personalizările, disponibilitatea și stocul înainte de înregistrarea
          atomică a comenzii și a stocului disponibil.
        </p>
      </header>
      <CheckoutForm
        idempotencyKey={idempotencyKey}
        paymentCancelled={payment === "cancelled"}
        prefill={prefill}
        shippingMethods={shippingMethods}
      />
    </main>
  );
}
