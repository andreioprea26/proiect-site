import Link from "next/link";

import { getAuthenticatedUser } from "@/lib/auth/user";

export async function AccountNavigation() {
  const user = await getAuthenticatedUser();

  return (
    <Link
      className="rounded-full border border-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:border-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      href={user ? "/account" : "/login"}
    >
      {user ? "Contul meu" : "Autentificare"}
    </Link>
  );
}
