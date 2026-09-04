import Link from "next/link";

import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/admin/order-model";

const sections = [
  { href: "/admin/orders", title: "Comenzi", description: "Procesează comenzile și urmărește istoricul statusurilor." },
  { href: "/admin/products", title: "Produse", description: "Creează, editează, publică și arhivează produse." },
  { href: "/admin/categories", title: "Categorii", description: "Organizează produsele în categorii." },
  { href: "/admin/collections", title: "Colecții", description: "Grupează produsele în colecții tematice." },
  { href: "/admin/reviews", title: "Recenzii", description: "Aprobă sau respinge recenziile cumpărătorilor verificați." },
  { href: "/admin/homepage", title: "Homepage", description: "Editează bannerul și secțiunile principale ale storefront-ului." },
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
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link className="rounded-2xl border border-stone-800 bg-stone-900 p-6 transition hover:border-emerald-700" href={section.href} key={section.href}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">{section.description}</p>
          </Link>
        ))}
      </div>
      <section className="mt-10" data-testid="admin-statistics-dashboard">
        <div>
          <p className="text-sm font-medium text-emerald-400">Statistici MVP</p>
          <h2 className="mt-1 text-2xl font-semibold">Imagine de ansamblu</h2>
          <p className="mt-2 text-xs text-stone-500">Comenzile recente acoperă ultimele {dashboard.stats.periodDays} de zile; valorile financiare sunt totaluri confirmate, separate după metoda de încasare.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric id="recent-orders" label="Comenzi recente" value={dashboard.stats.recentOrderCount} />
          <Metric id="attention-orders" label="Comenzi care necesită atenție" value={dashboard.stats.attentionOrderCount} />
          <Metric id="stripe-gross" label="Stripe încasat brut" value={money(dashboard.stats.stripeCollectedGrossMinor, dashboard.stats.currency)} />
          <Metric id="cod-collected" label="COD încasat" value={money(dashboard.stats.codCollectedMinor, dashboard.stats.currency)} />
          <Metric id="refunds" label="Refunduri Stripe reușite" value={money(dashboard.stats.successfulRefundsMinor, dashboard.stats.currency)} />
          <Metric id="stripe-net" label="Stripe încasat net după refunduri" value={money(dashboard.stats.stripeCollectedNetMinor, dashboard.stats.currency)} />
          <Metric id="pending-reviews" label="Recenzii în așteptare" value={dashboard.stats.pendingReviewCount} />
          <Metric id="new-contacts" label="Mesaje contact noi" value={dashboard.stats.newContactCount} />
          <Metric id="new-custom-requests" label="Cereri personalizate noi" value={dashboard.stats.newCustomRequestCount} />
          <Metric id="active-subscribers" label="Abonări newsletter active" value={dashboard.stats.activeSubscriberCount} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Comenzi recente pe status">
          {Object.entries(dashboard.stats.ordersByStatus).map(([status, count]) => (
            <span className="rounded-full border border-stone-800 bg-stone-900 px-3 py-1 text-xs text-stone-300" key={status}>
              {status in ORDER_STATUS_LABELS ? ORDER_STATUS_LABELS[status as OrderStatus] : status}: {count}
            </span>
          ))}
        </div>
      </section>
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
function Metric({ id, label, value }: { id: string; label: string; value: number | string }) { return <article className="rounded-2xl border border-stone-800 bg-stone-900 p-5" data-metric={id}><p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold text-stone-100">{value}</p></article>; }
function money(value: number, currency: string) { return new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value / 100); }
