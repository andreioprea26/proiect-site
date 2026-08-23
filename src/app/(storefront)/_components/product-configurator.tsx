"use client";

import { useMemo, useState } from "react";

import type { StorefrontProductDetail } from "@/lib/storefront/catalog";

const currency = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
});

type CustomizationValue = string | boolean;

export function ProductConfigurator({
  basePrice,
  customizations,
  variants,
}: Pick<
  StorefrontProductDetail,
  "basePrice" | "customizations" | "variants"
>) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id ?? "",
  );
  const [values, setValues] = useState<Record<string, CustomizationValue>>({});
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const configuredBasePrice = selectedVariant?.effectivePrice ?? basePrice;
  const additionalCost = useMemo(
    () =>
      customizations.reduce((total, customization) => {
        const value = values[customization.id];
        const selected =
          typeof value === "boolean" ? value : Boolean(value?.trim());
        return selected ? total + customization.additionalCost : total;
      }, 0),
    [customizations, values],
  );

  function updateValue(id: string, value: CustomizationValue) {
    setValues((current) => ({ ...current, [id]: value }));
  }

  return (
    <div className="grid gap-8">
      <div className="rounded-2xl bg-emerald-50 p-5" aria-live="polite">
        <p className="text-sm font-medium text-emerald-900">Preț orientativ</p>
        <p className="mt-1 text-3xl font-semibold text-emerald-950" data-testid="configured-price">
          {currency.format(configuredBasePrice + additionalCost)}
        </p>
        {additionalCost > 0 ? (
          <p className="mt-2 text-sm text-emerald-800">
            Include {currency.format(additionalCost)} din personalizările selectate.
          </p>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-emerald-800/80">
          Prețul final va fi recalculat și validat la checkout.
        </p>
      </div>

      <section aria-labelledby="product-variants">
        <h2 className="text-2xl font-semibold" id="product-variants">Variante</h2>
        {variants.length > 0 ? (
          <fieldset className="mt-4 grid gap-3">
            <legend className="sr-only">Alege varianta produsului</legend>
            {variants.map((variant) => (
              <label
                className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-stone-300 bg-white p-4 has-checked:border-emerald-800 has-checked:ring-2 has-checked:ring-emerald-100"
                key={variant.id}
              >
                <span className="flex gap-3">
                  <input
                    checked={selectedVariantId === variant.id}
                    className="mt-1 accent-emerald-800"
                    name="product-variant"
                    onChange={() => setSelectedVariantId(variant.id)}
                    type="radio"
                    value={variant.id}
                  />
                  <span>
                    <span className="block font-semibold">{variant.title}</span>
                    <span className="mt-1 block text-sm text-stone-600">
                      {Object.entries(variant.attributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="whitespace-nowrap text-sm font-semibold text-emerald-900">
                  {currency.format(variant.effectivePrice)}
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="mt-3 text-stone-600">Acest produs nu are variante de selectat.</p>
        )}
      </section>

      <section aria-labelledby="product-customizations">
        <h2 className="text-2xl font-semibold" id="product-customizations">Personalizări</h2>
        {customizations.length > 0 ? (
          <div className="mt-4 grid gap-5">
            {customizations.map((customization) => (
              <CustomizationControl
                customization={customization}
                key={customization.id}
                onChange={(value) => updateValue(customization.id, value)}
                value={values[customization.id]}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-stone-600">Acest produs nu are opțiuni de personalizare.</p>
        )}
      </section>
    </div>
  );
}

function CustomizationControl({
  customization,
  onChange,
  value,
}: {
  customization: StorefrontProductDetail["customizations"][number];
  onChange: (value: CustomizationValue) => void;
  value: CustomizationValue | undefined;
}) {
  const id = `customization-${customization.id}`;
  const costLabel =
    customization.additionalCost > 0
      ? `+ ${currency.format(customization.additionalCost)}`
      : "Fără cost suplimentar";
  const label = `${customization.name}${customization.isRequired ? " (obligatoriu)" : ""}`;
  const values = Array.isArray(customization.configuration.values)
    ? customization.configuration.values.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const minLength = numberConfiguration(
    customization.configuration.min_length,
  );
  const maxLength = numberConfiguration(
    customization.configuration.max_length,
  );
  const multiline = customization.configuration.multiline === true;
  const instructions =
    typeof customization.configuration.instructions === "string"
      ? customization.configuration.instructions
      : null;

  return (
    <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
      <legend className="px-1 font-semibold text-stone-950">{label}</legend>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {customization.description ? (
          <p className="text-stone-600">{customization.description}</p>
        ) : <span />}
        <span className="font-semibold text-emerald-900">{costLabel}</span>
      </div>

      {customization.optionType === "selection" ? (
        <label className="block text-sm font-medium" htmlFor={id}>
          Alege o opțiune
          <select
            className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            id={id}
            onChange={(event) => onChange(event.target.value)}
            required={customization.isRequired}
            value={typeof value === "string" ? value : ""}
          >
            <option value="">Selectează</option>
            {values.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ) : null}

      {customization.optionType === "text" ? (
        <label className="block text-sm font-medium" htmlFor={id}>
          Răspunsul tău
          {multiline ? (
            <textarea
              className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id={id}
              maxLength={maxLength ?? undefined}
              minLength={minLength ?? undefined}
              onChange={(event) => onChange(event.target.value)}
              required={customization.isRequired}
              rows={4}
              value={typeof value === "string" ? value : ""}
            />
          ) : (
            <input
              className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id={id}
              maxLength={maxLength ?? undefined}
              minLength={minLength ?? undefined}
              onChange={(event) => onChange(event.target.value)}
              required={customization.isRequired}
              type="text"
              value={typeof value === "string" ? value : ""}
            />
          )}
          {minLength !== null || maxLength !== null ? (
            <span className="mt-2 block text-xs text-stone-500">
              {minLength !== null ? `Minimum ${minLength}` : ""}
              {minLength !== null && maxLength !== null ? " · " : ""}
              {maxLength !== null ? `Maximum ${maxLength} caractere` : ""}
            </span>
          ) : null}
        </label>
      ) : null}

      {customization.optionType === "boolean" ? (
        <label className="flex items-center gap-3 text-sm font-medium" htmlFor={id}>
          <input
            checked={value === true}
            className="size-4 accent-emerald-800"
            id={id}
            onChange={(event) => onChange(event.target.checked)}
            type="checkbox"
          />
          Da, doresc această opțiune
        </label>
      ) : null}

      {customization.optionType === "image" ? (
        <div>
          <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            {instructions ?? "Imaginea de referință va putea fi furnizată în fluxul comenzii."}
          </p>
          <label className="mt-3 flex items-center gap-3 text-sm font-medium" htmlFor={id}>
            <input
              checked={value === true}
              className="size-4 accent-emerald-800"
              id={id}
              onChange={(event) => onChange(event.target.checked)}
              type="checkbox"
            />
            Voi furniza o imagine de referință la comandă
          </label>
          <p className="mt-2 text-xs text-stone-500">Upload-ul privat nu este activ în această etapă.</p>
        </div>
      ) : null}
    </fieldset>
  );
}

function numberConfiguration(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
