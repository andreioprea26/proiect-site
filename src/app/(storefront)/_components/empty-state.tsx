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
    <div className="rounded-3xl border border-dashed border-brand-border bg-brand-surface/70 px-6 py-12 text-center">
      <h2 className="text-xl font-semibold text-brand-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-brand-muted">{description}</p>
      {showShopLink ? (
        <Link
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
          href="/shop"
        >
          Înapoi la Magazin
        </Link>
      ) : null}
    </div>
  );
}
