import type { Metadata } from "next";

import { OrdersList } from "@/app/admin/_components/orders-list";
import { listAdminOrders, normalizeAdminOrderListInput } from "@/lib/admin/orders";

export const metadata: Metadata = { title: "Comenzi | Admin" };

export default async function AdminOrdersPage() {
  const initialState = await listAdminOrders(normalizeAdminOrderListInput());
  return (
    <div>
      <p className="text-sm font-medium text-emerald-400">Operațiuni</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Comenzi</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">Caută, filtrează și deschide comenzile. Lista este paginată și afișează separat starea operațională și starea plății.</p>
      <OrdersList initialState={initialState} />
    </div>
  );
}
