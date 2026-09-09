import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Am uitat parola | Brand Handmade",
  description: "Solicită instrucțiuni pentru resetarea parolei contului tău.",
  robots: PRIVATE_ROBOTS,
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-800">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Resetează parola
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Introdu adresa de e-mail asociată contului tău.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-stone-600">
          Ți-ai amintit parola?{" "}
          <Link
            className="font-medium text-emerald-800 underline-offset-4 hover:underline"
            href="/login"
          >
            Înapoi la autentificare
          </Link>
        </p>
      </section>
    </main>
  );
}
