"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  configureCartLine,
  type CartConfigurationErrors,
  type CartConfigurationValue,
  type CartProductConfiguration,
} from "@/lib/cart/configuration";
import {
  formatMoney,
  maxQuantityForProduct,
  toMinorUnits,
} from "@/lib/cart/model";
import type { StorefrontProductDetail } from "@/lib/storefront/catalog";

import { useCart } from "./cart-provider";

type ProductConfiguratorProduct = Pick<
  StorefrontProductDetail,
  | "id"
  | "slug"
  | "name"
  | "basePrice"
  | "productType"
  | "availabilityStatus"
  | "image"
  | "variants"
  | "customizations"
>;

const emptyErrors: CartConfigurationErrors = { customizations: {} };

export function ProductConfigurator({
  product,
}: {
  product: ProductConfiguratorProduct;
}) {
  const { addLine } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [values, setValues] = useState<
    Record<string, CartConfigurationValue>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<CartConfigurationErrors>(emptyErrors);
  const [feedback, setFeedback] = useState("");
  const selectedVariant = product.variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const configuredBasePriceMinor = toMinorUnits(
    selectedVariant?.effectivePrice ?? product.basePrice,
  );
  const additionalCostMinor = useMemo(
    () =>
      product.customizations.reduce((total, customization) => {
        const value = values[customization.id];
        const selected =
          typeof value === "boolean" ? value : Boolean(value?.trim());
        return selected
          ? total + toMinorUnits(customization.additionalCost)
          : total;
      }, 0),
    [product.customizations, values],
  );
  const maximumQuantity = maxQuantityForProduct(
    product.productType,
    product.availabilityStatus,
  );
  const requiredImage = product.customizations.find(
    (customization) =>
      customization.optionType === "image" && customization.isRequired,
  );
  const isUnavailable = product.availabilityStatus === "unavailable";

  function updateValue(id: string, value: CartConfigurationValue) {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({
      ...current,
      customizations: Object.fromEntries(
        Object.entries(current.customizations).filter(([key]) => key !== id),
      ),
    }));
    setFeedback("");
  }

  function addToCart() {
    const configuration: CartProductConfiguration = product;
    const result = configureCartLine(
      configuration,
      selectedVariantId,
      values,
      quantity,
    );
    setErrors(result.errors);
    setFeedback("");
    if (!result.line) return;

    addLine(result.line);
    setFeedback(
      `${quantity} ${quantity === 1 ? "articol a fost adăugat" : "articole au fost adăugate"} în coș.`,
    );
  }

  return (
    <div className="grid gap-8">
      <div className="rounded-2xl bg-emerald-50 p-5" aria-live="polite">
        <p className="text-sm font-medium text-emerald-900">Preț orientativ</p>
        <p
          className="mt-1 text-3xl font-semibold text-emerald-950"
          data-testid="configured-price"
        >
          {formatMoney(configuredBasePriceMinor + additionalCostMinor)}
        </p>
        {additionalCostMinor > 0 ? (
          <p className="mt-2 text-sm text-emerald-800">
            Include {formatMoney(additionalCostMinor)} din personalizările
            selectate.
          </p>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-emerald-800/80">
          Prețul final, disponibilitatea și stocul vor fi recalculate și validate
          pe server la checkout.
        </p>
      </div>

      <section aria-labelledby="product-variants">
        <h2 className="text-2xl font-semibold" id="product-variants">
          Variante
        </h2>
        {product.variants.length > 0 ? (
          <fieldset
            aria-describedby={errors.variant ? "variant-error" : undefined}
            className="mt-4 grid gap-3"
          >
            <legend className="sr-only">Alege varianta produsului</legend>
            {product.variants.map((variant) => (
              <label
                className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-stone-300 bg-white p-4 has-checked:border-emerald-800 has-checked:ring-2 has-checked:ring-emerald-100"
                key={variant.id}
              >
                <span className="flex gap-3">
                  <input
                    checked={selectedVariantId === variant.id}
                    className="mt-1 accent-emerald-800"
                    name="product-variant"
                    onChange={() => {
                      setSelectedVariantId(variant.id);
                      setErrors((current) => ({
                        ...current,
                        variant: undefined,
                      }));
                      setFeedback("");
                    }}
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
                  {formatMoney(toMinorUnits(variant.effectivePrice))}
                </span>
              </label>
            ))}
            {errors.variant ? (
              <p className="text-sm text-red-700" id="variant-error" role="alert">
                {errors.variant}
              </p>
            ) : null}
          </fieldset>
        ) : (
          <p className="mt-3 text-stone-600">
            Acest produs nu are variante de selectat.
          </p>
        )}
      </section>

      <section aria-labelledby="product-customizations">
        <h2 className="text-2xl font-semibold" id="product-customizations">
          Personalizări
        </h2>
        {product.customizations.length > 0 ? (
          <div className="mt-4 grid gap-5">
            {product.customizations.map((customization) => (
              <CustomizationControl
                customization={customization}
                error={errors.customizations[customization.id]}
                key={customization.id}
                onChange={(value) => updateValue(customization.id, value)}
                value={values[customization.id]}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-stone-600">
            Acest produs nu are opțiuni de personalizare.
          </p>
        )}
      </section>

      <section aria-labelledby="cart-quantity">
        <h2 className="text-2xl font-semibold" id="cart-quantity">
          Cantitate
        </h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm font-medium" htmlFor="product-quantity">
            Număr de articole
            <input
              aria-describedby={errors.quantity ? "quantity-error" : undefined}
              aria-invalid={Boolean(errors.quantity)}
              className="mt-2 block w-28 rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id="product-quantity"
              max={maximumQuantity}
              min="1"
              onChange={(event) => {
                setQuantity(event.target.valueAsNumber);
                setErrors((current) => ({ ...current, quantity: undefined }));
                setFeedback("");
              }}
              type="number"
              value={Number.isNaN(quantity) ? "" : quantity}
            />
          </label>
          {maximumQuantity === 1 ? (
            <p className="pb-2 text-sm text-stone-600">
              Produsele unicat sunt limitate la un exemplar.
            </p>
          ) : null}
        </div>
        {errors.quantity ? (
          <p className="mt-2 text-sm text-red-700" id="quantity-error" role="alert">
            {errors.quantity}
          </p>
        ) : null}
      </section>

      {requiredImage ? (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          „{requiredImage.name}” necesită încărcare privată. Produsul nu poate fi
          adăugat până când acest flux este disponibil în checkout; bucket-ul
          public de produse nu este folosit pentru fișierele clienților.
        </p>
      ) : null}
      {errors.general ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errors.general}
        </p>
      ) : null}

      <button
        className="min-h-12 rounded-full bg-emerald-900 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        disabled={isUnavailable || Boolean(requiredImage)}
        onClick={addToCart}
        type="button"
      >
        {isUnavailable ? "Produs indisponibil" : "Adaugă în coș"}
      </button>
      <div aria-live="polite" className="min-h-6 text-sm" role="status">
        {feedback ? (
          <p className="font-medium text-emerald-800">
            {feedback}{" "}
            <Link className="underline" href="/cart">
              Vezi coșul
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CustomizationControl({
  customization,
  error,
  onChange,
  value,
}: {
  customization: StorefrontProductDetail["customizations"][number];
  error?: string;
  onChange: (value: CartConfigurationValue) => void;
  value: CartConfigurationValue | undefined;
}) {
  const id = `customization-${customization.id}`;
  const errorId = `${id}-error`;
  const costLabel =
    customization.additionalCost > 0
      ? `+ ${formatMoney(toMinorUnits(customization.additionalCost))}`
      : "Fără cost suplimentar";
  const label = `${customization.name}${customization.isRequired ? " (obligatoriu)" : ""}`;
  const values = Array.isArray(customization.configuration.values)
    ? customization.configuration.values.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const minLength = numberConfiguration(customization.configuration.min_length);
  const maxLength = numberConfiguration(customization.configuration.max_length);
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
        ) : (
          <span />
        )}
        <span className="font-semibold text-emerald-900">{costLabel}</span>
      </div>

      {customization.optionType === "selection" ? (
        <label className="block text-sm font-medium" htmlFor={id}>
          Alege o opțiune
          <select
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            id={id}
            onChange={(event) => onChange(event.target.value)}
            required={customization.isRequired}
            value={typeof value === "string" ? value : ""}
          >
            <option value="">Selectează</option>
            {values.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {customization.optionType === "text" ? (
        <label className="block text-sm font-medium" htmlFor={id}>
          Răspunsul tău
          {multiline ? (
            <textarea
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
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
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
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
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
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
            {instructions ??
              "Imaginea de referință va putea fi furnizată în fluxul comenzii."}
          </p>
          <label className="mt-3 flex items-center gap-3 text-sm font-medium" htmlFor={id}>
            <input
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
              checked={value === true}
              className="size-4 accent-emerald-800"
              disabled={customization.isRequired}
              id={id}
              onChange={(event) => onChange(event.target.checked)}
              type="checkbox"
            />
            Voi furniza o imagine de referință la comandă
          </label>
          <p className="mt-2 text-xs text-stone-500">
            Upload-ul privat nu este activ în această etapă.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function numberConfiguration(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
