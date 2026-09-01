import Link from "next/link";

const sections = [
  { href: "/admin/orders", title: "Comenzi", description: "Procesează comenzile și urmărește istoricul statusurilor." },
  { href: "/admin/products", title: "Produse", description: "Creează, editează, publică și arhivează produse." },
  { href: "/admin/categories", title: "Categorii", description: "Organizează produsele în categorii." },
  { href: "/admin/collections", title: "Colecții", description: "Grupează produsele în colecții tematice." },
];

export default function AdminPage() {
  return (
    <div>
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-emerald-400">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 text-sm leading-6 text-stone-300">
          Administrează catalogul magazinului din secțiunile de mai jos.
        </p>
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Link className="rounded-2xl border border-stone-800 bg-stone-900 p-6 transition hover:border-emerald-700" href={section.href} key={section.href}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
