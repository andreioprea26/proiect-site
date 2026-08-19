import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isCurrentUserAdmin } from "@/lib/auth/authorization";
import { getAuthenticatedUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Admin | Brand Handmade",
  description: "Zonă administrativă protejată.",
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 bg-stone-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link className="font-semibold text-emerald-400" href="/admin">Brand Handmade — Admin</Link>
          <Link className="text-sm text-stone-300" href="/">Magazin</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
