import Link from "next/link";

export function EmptyState({
  title,
  description,
  showShopLink = false,
}: {
  title: string;
  description: string;
  showShopLink?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
      <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-stone-600">{description}</p>
      {showShopLink ? (
        <Link
          className="mt-6 inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href="/shop"
        >
          Înapoi la Magazin
        </Link>
      ) : null}
    </div>
  );
}
