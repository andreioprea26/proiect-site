import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isCurrentUserAdmin } from "@/lib/auth/authorization";
import { getAuthenticatedUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Admin | Brand Handmade",
  description: "Zonă administrativă protejată.",
};

export default async function AdminPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-stone-100">
      <section className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-8 shadow-sm">
        <p className="text-sm font-medium text-emerald-400">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 text-sm leading-6 text-stone-300">
          Zona administrativă este disponibilă numai utilizatorilor autorizați.
        </p>
      </section>
    </main>
  );
}
