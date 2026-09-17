import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/user";

export default async function AccountPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <section>
      <p className="text-sm font-medium text-brand">Cont client</p>
      <h1 className="mt-2 text-3xl font-semibold">Contul meu</h1>
      <p className="mt-3 text-brand-muted">
        E-mail: <span className="font-medium text-brand-text">{user.email ?? "—"}</span>
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link className="rounded-xl border border-brand-border/25 bg-brand-surface p-5 shadow-sm" href="/account/profile">
          <span className="font-semibold">Profil</span>
          <span className="mt-2 block text-sm text-brand-muted">Vezi și actualizează datele tale de bază.</span>
        </Link>
        <Link className="rounded-xl border border-brand-border/25 bg-brand-surface p-5 shadow-sm" href="/account/addresses">
          <span className="font-semibold">Adrese</span>
          <span className="mt-2 block text-sm text-brand-muted">Administrează adresele pentru livrare.</span>
        </Link>
        <Link className="rounded-xl border border-brand-border/25 bg-brand-surface p-5 shadow-sm" href="/account/orders">
          <span className="font-semibold">Comenzi</span>
          <span className="mt-2 block text-sm text-brand-muted">Vezi istoricul și detaliile comenzilor tale.</span>
        </Link>
        <Link className="rounded-xl border border-brand-border/25 bg-brand-surface p-5 shadow-sm" href="/account/favorites">
          <span className="font-semibold">Favorite</span>
          <span className="mt-2 block text-sm text-brand-muted">Regăsește produsele pe care le-ai salvat.</span>
        </Link>
      </div>
    </section>
  );
}
