import type { Metadata } from "next";
import { getAdminStoreSettings } from "@/lib/store-settings/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Store Settings | Admin" };

export default async function SettingsPage() {
  const settings = await getAdminStoreSettings();
  return <section>
    <h1 className="text-3xl font-semibold">Store Settings</h1>
    <p className="mt-3 text-stone-400">Identitatea publică a magazinului. Configurația tehnică și plățile nu se modifică aici.</p>
    {settings.available ? <SettingsForm values={settings.values} /> : <p className="mt-6" role="alert">Setările nu pot fi încărcate momentan. Reîncarcă pagina înainte de editare.</p>}
  </section>;
}
