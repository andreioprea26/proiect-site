import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney } from "@/lib/cart/model";
import { getOrderConfirmation } from "@/lib/checkout/server";

import { CardCartConfirmation } from "./card-cart-confirmation";

export const metadata: Metadata = {
  title: "Comandă înregistrată",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const confirmation = await getOrderConfirmation(token);
  if (!confirmation) notFound();
  const isCard = confirmation.paymentMethod === "card";
  const isPaid = confirmation.paymentStatus === "paid";

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <section className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
          {isCard && isPaid ? "Plată confirmată" : "Comandă înregistrată"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Mulțumim pentru comandă!
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          {isCard
            ? isPaid
              ? "Stripe a confirmat plata, iar rezervarea de stoc a fost consumată în siguranță."
              : "Plata este în curs de confirmare. Această pagină nu poate marca plata drept achitată; starea se actualizează numai prin webhook-ul Stripe verificat."
            : "Am înregistrat comanda ramburs. Păstrează numărul de mai jos pentru comunicarea cu magazinul."}
        </p>
        <dl className="mt-8 grid gap-4 rounded-2xl bg-stone-50 p-5 sm:grid-cols-2">
          <ConfirmationItem label="Număr comandă" value={confirmation.publicNumber} />
          <ConfirmationItem label="Total" value={formatMoney(confirmation.totalMinor)} />
          <ConfirmationItem
            label="Plată"
            value={
              isCard
                ? isPaid
                  ? "Card online · confirmată"
                  : "Card online · în curs de confirmare"
                : "Ramburs la livrare · neachitată"
            }
          />
          <ConfirmationItem label="Livrare" value={confirmation.shippingMethodName} />
        </dl>
        <p className="mt-6 text-sm leading-6 text-stone-600">
          {isCard
            ? isPaid
              ? "Coșul inițial este golit numai după această confirmare internă."
              : "Poți reîncărca pagina peste câteva momente. Coșul rămâne păstrat până când plata este confirmată."
            : "Magazinul va verifica manual comanda și va continua procesarea. Acest ecran nu confirmă încasarea plății."}
        </p>
        {isCard && !isPaid ? (
          <Link
            className="mt-5 inline-flex text-sm font-semibold text-emerald-900 underline"
            href={`/order-confirmation/${token}`}
          >
            Verifică din nou starea plății
          </Link>
        ) : null}
        <Link
          className="mt-8 inline-flex rounded-full bg-emerald-900 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          href="/shop"
        >
          Continuă cumpărăturile
        </Link>
      </section>
      {isCard ? (
        <CardCartConfirmation confirmationToken={token} paid={isPaid} />
      ) : null}
    </main>
  );
}

function ConfirmationItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-stone-950">{value}</dd>
    </div>
  );
}
