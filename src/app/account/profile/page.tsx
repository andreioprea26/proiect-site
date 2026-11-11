import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/server";

import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const context = await getAccountContext();
  if (!context) redirect("/login");

  const { data: profile } = await context.supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", context.user.id)
    .maybeSingle();

  return (
    <section className="max-w-2xl">
      <p className="text-sm font-medium text-emerald-800">Cont client</p>
      <h1 className="mt-2 text-3xl font-semibold">Profilul meu</h1>
      <p className="mt-3 text-stone-600">Actualizează datele folosite pentru contul tău.</p>
      <ProfileForm
        email={context.user.email ?? ""}
        firstName={profile?.first_name ?? ""}
        lastName={profile?.last_name ?? ""}
        phone={profile?.phone ?? ""}
      />
    </section>
  );
}
