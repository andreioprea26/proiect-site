import Link from "next/link";

import { getAuthenticatedUser } from "@/lib/auth/user";

import { logout } from "./login/actions";

export async function SessionControls() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="mt-8 flex justify-center gap-3">
        <Link
          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
          href="/login"
        >
          Autentificare
        </Link>
        <Link
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-900"
          href="/register"
        >
          Creează cont
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-emerald-800">Sesiune activă</p>
      <div className="mt-3 flex justify-center gap-3">
        <Link
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-900"
          href="/account"
        >
          Contul meu
        </Link>
        <form action={logout}>
        <button
          className="rounded-lg border border-stone-400 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          type="submit"
        >
          Deconectare
        </button>
        </form>
      </div>
    </div>
  );
}
