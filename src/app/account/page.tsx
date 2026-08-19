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
      <p className="text-sm font-medium text-emerald-800">Cont client</p>
      <h1 className="mt-2 text-3xl font-semibold">Contul meu</h1>
      <p className="mt-3 text-stone-600">
        E-mail: <span className="font-medium text-stone-900">{user.email ?? "—"}</span>
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm" href="/account/profile">
          <span className="font-semibold">Profil</span>
          <span className="mt-2 block text-sm text-stone-600">Vezi și actualizează datele tale de bază.</span>
        </Link>
        <Link className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm" href="/account/addresses">
          <span className="font-semibold">Adrese</span>
          <span className="mt-2 block text-sm text-stone-600">Administrează adresele pentru livrare.</span>
        </Link>
      </div>
    </section>
  );
}
