import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Autentificare | Brand Handmade",
  description: "Autentifică-te în contul tău Brand Handmade.",
};

export default function LoginPage() {
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
        <LoginForm />
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
