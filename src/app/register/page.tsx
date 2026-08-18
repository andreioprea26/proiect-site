import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Înregistrare | Brand Handmade",
  description: "Creează un cont de client pentru magazinul Brand Handmade.",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-800">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Creează un cont
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Completează datele de mai jos. Dacă este necesară confirmarea
          adresei, vei primi instrucțiuni prin e-mail.
        </p>
        <RegisterForm />
      </section>
    </main>
  );
}
