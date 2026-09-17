import type { PublicStoreConfig } from "@/lib/config/store";

export function StorePublicContact({ store }: { store: PublicStoreConfig }) {
  return <div className="mt-3 flex flex-wrap gap-3 text-sm" aria-label="Contact și rețele sociale">
    {store.contact.email ? <a href={`mailto:${store.contact.email}`}>{store.contact.email}</a> : null}
    {store.contact.phone ? <a href={`tel:${store.contact.phone}`}>{store.contact.phone}</a> : null}
    {store.contact.whatsapp ? <a href={`https://wa.me/${store.contact.whatsapp.replace(/^\+/, "")}`}>WhatsApp</a> : null}
    {Object.entries(store.social).map(([platform, href]) => href ? <a href={href} key={platform} rel="noopener noreferrer">{platform}</a> : null)}
  </div>;
}
