import Link from "next/link";

import { getAdminDashboardData } from "@/lib/admin/dashboard";

const sections = [
  { href: "/admin/orders", title: "Comenzi", description: "Procesează comenzile și urmărește istoricul statusurilor." },
  { href: "/admin/products", title: "Produse", description: "Creează, editează, publică și arhivează produse." },
  { href: "/admin/categories", title: "Categorii", description: "Organizează produsele în categorii." },
  { href: "/admin/collections", title: "Colecții", description: "Grupează produsele în colecții tematice." },
  { href: "/admin/reviews", title: "Recenzii", description: "Aprobă sau respinge recenziile cumpărătorilor verificați." },
];

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

export default async function AdminPage() {
  const dashboard = await getAdminDashboardData();
  return (
    <div>
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-emerald-400">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 text-sm leading-6 text-stone-300">
          Administrează catalogul magazinului din secțiunile de mai jos.
        </p>
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {sections.map((section) => (
          <Link className="rounded-2xl border border-stone-800 bg-stone-900 p-6 transition hover:border-emerald-700" href={section.href} key={section.href}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">{section.description}</p>
          </Link>
        ))}
      </div>
      <section className="mt-10" data-testid="admin-operations-dashboard">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-emerald-400">Operațiuni Faza 7</p><h2 className="mt-1 text-2xl font-semibold">Dashboard operațional</h2></div><p className="text-xs text-stone-500">Stoc disponibil = fizic − rezervări active neexpirate</p></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <DashboardCard count={dashboard.newOrderCount} title="Comenzi noi">
            {dashboard.newOrders.map((order) => <OrderLink key={order.id} order={order} />)}
            <FooterLink href="/admin/orders?status=new">Vezi comenzile noi</FooterLink>
          </DashboardCard>
          <DashboardCard count={dashboard.lowStockCount} title="Stoc redus">
            {dashboard.lowStock.map((item) => <Link className="block rounded-lg bg-stone-950 p-3 text-sm hover:bg-stone-800" href={`/admin/products/${item.productId}`} key={item.inventoryId}><span className="font-semibold">{item.label}</span><span className="mt-1 block text-xs text-stone-400">Disponibil {item.effectiveAvailable} · fizic {item.physicalQuantity} · rezervat {item.reservedQuantity} · prag {item.threshold}</span></Link>)}
            <FooterLink href="/admin/products">Gestionează inventarul</FooterLink>
          </DashboardCard>
          <DashboardCard count={dashboard.customizationCount} title="Review personalizări">
            {dashboard.customizationOrders.map((order) => <OrderLink key={order.id} order={order} />)}
            <FooterLink href="/admin/orders?status=awaiting_customization_review">Vezi review-urile</FooterLink>
          </DashboardCard>
        </div>
      </section>
    </div>
  );
}

function DashboardCard({ children, count, title }: { children: React.ReactNode; count: number; title: string }) { return <article className="rounded-2xl border border-stone-800 bg-stone-900 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3><span className="rounded-full bg-emerald-950 px-3 py-1 text-sm font-semibold text-emerald-200">{count}</span></div><div className="mt-4 grid gap-2">{children}</div></article>; }
function OrderLink({ order }: { order: { id: string; publicNumber: string; createdAt: string } }) { return <Link className="block rounded-lg bg-stone-950 p-3 text-sm hover:bg-stone-800" href={`/admin/orders/${order.id}`}><span className="font-semibold">{order.publicNumber}</span><span className="mt-1 block text-xs text-stone-500">{dateFormatter.format(new Date(order.createdAt))}</span></Link>; }
function FooterLink({ children, href }: { children: React.ReactNode; href: string }) { return <Link className="mt-2 text-sm font-semibold text-emerald-400 underline-offset-4 hover:underline" href={href}>{children} →</Link>; }
