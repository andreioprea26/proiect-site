import type { CatalogActionState } from "@/lib/admin/catalog-validation";

export function ActionMessage({ state }: { state: CatalogActionState }) {
  if (!state.message) return null;

  return (
    <p
      aria-live="polite"
      className={`rounded-lg p-3 text-sm ${
        state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"
      }`}
      role="status"
    >
      {state.message}
    </p>
  );
}
