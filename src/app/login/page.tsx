import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Autentificare | Brand Handmade",
  description: "Autentifică-te în contul tău Brand Handmade.",
  robots: PRIVATE_ROBOTS,
};

type LoginPageProps = {
  searchParams: Promise<{ passwordReset?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { passwordReset } = await searchParams;
  const passwordWasReset = passwordReset === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-800">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Autentificare
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Introdu adresa de e-mail confirmată și parola contului tău.
        </p>
        {passwordWasReset ? (
          <p
            className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Parola a fost schimbată. Acum te poți autentifica folosind parola nouă.
          </p>
        ) : null}
        <LoginForm />
        <p className="mt-4 text-center text-sm">
          <Link
            className="font-medium text-emerald-800 underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Ai uitat parola?
          </Link>
        </p>
        <p className="mt-6 text-center text-sm text-stone-600">
          Nu ai cont?{" "}
          <Link
            className="font-medium text-emerald-800 underline-offset-4 hover:underline"
            href="/register"
          >
            Creează unul
          </Link>
        </p>
      </section>
    </main>
  );
}
