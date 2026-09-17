import Link from "next/link";

import { getAuthenticatedUser } from "@/lib/auth/user";

export async function AccountNavigation() {
  const user = await getAuthenticatedUser();

  return (
    <Link
      className="rounded-full border border-brand/20 px-4 py-2 text-sm font-semibold text-brand-strong transition hover:border-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
      href={user ? "/account" : "/login"}
    >
      {user ? "Contul meu" : "Autentificare"}
    </Link>
  );
}
