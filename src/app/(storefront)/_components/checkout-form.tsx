"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { formatMoney, serializeCart } from "@/lib/cart/model";
import { cartLinesToCheckoutPayload } from "@/lib/checkout/payload";
import type {
  CheckoutActionState,
  CheckoutAddress,
  CheckoutPrefill,
  ShippingMethod,
} from "@/lib/checkout/types";

import { placeCheckoutOrder } from "../checkout/actions";
import { useCart } from "./cart-provider";

const EMPTY_ADDRESS: CheckoutAddress = {
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  county: "",
  postalCode: "",
  countryCode: "RO",
};

const initialCheckoutActionState: CheckoutActionState = {
  success: false,
  message: null,
  fieldErrors: {},
  quote: null,
  confirmationPath: null,
  redirectUrl: null,
  confirmationToken: null,
};

export function CheckoutForm({
  idempotencyKey,
  paymentCancelled,
  prefill,
  shippingMethods,
}: {
  idempotencyKey: string;
  paymentCancelled: boolean;
  prefill: CheckoutPrefill;
  shippingMethods: ShippingMethod[];
}) {
  const { clearCart, hydrated, lines, subtotalMinor } = useCart();
  const router = useRouter();
  const completionHandled = useRef(false);
  const [state, formAction, pending] = useActionState(
    placeCheckoutOrder,
    initialCheckoutActionState,
  );
  const [customerType, setCustomerType] = useState<"individual" | "company">(
    "individual",
  );
  const [billingSame, setBillingSame] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "card">(
    "cash_on_delivery",
  );
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddress>({
    ...EMPTY_ADDRESS,
    recipientName: prefill.customerName,
    phone: prefill.phone,
  });
  const cartPayload = useMemo(
    () => JSON.stringify(cartLinesToCheckoutPayload(lines)),
    [lines],
  );
  const serverPrices = new Map(
    state.quote?.lines.map((line) => [line.key, line.unitPriceMinor]) ?? [],
  );
  const cartLineNames = new Map(lines.map((line) => [line.key, line.name]));
  const priceChanged = lines.some(
    (line) =>
      serverPrices.has(line.key) &&
      serverPrices.get(line.key) !== line.unitPriceMinor,
  );
  const canValidate =
    hydrated && lines.length > 0 && shippingMethods.length > 0 && !pending;

  useEffect(() => {
    if (
      state.success &&
      !completionHandled.current
    ) {
      if (state.redirectUrl && state.confirmationToken) {
        completionHandled.current = true;
        window.sessionStorage.setItem(
          `brand-handmade:card-checkout:${state.confirmationToken}`,
          serializeCart(lines),
        );
        window.location.assign(state.redirectUrl);
        return;
      }
      if (!state.confirmationPath) return;
      completionHandled.current = true;
      clearCart();
      router.replace(state.confirmationPath);
    }
  }, [clearCart, lines, router, state.confirmationPath, state.confirmationToken, state.redirectUrl, state.success]);

  if (!hydrated) {
    return <p className="mt-10 text-stone-600">Se încarcă checkout-ul…</p>;
  }

  if (lines.length === 0) {
    return (
      <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold">Coșul este gol</h2>
        <p className="mt-3 text-stone-600">
          Adaugă cel puțin un produs înainte de checkout.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white"
          href="/shop"
        >
          Vezi produsele
        </Link>
      </section>
    );
  }

  return (
    <form action={formAction} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <input name="cartPayload" type="hidden" value={cartPayload} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="grid gap-6">
        {paymentCancelled ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
            Plata nu a fost finalizată. Coșul este păstrat, iar rezervarea rămâne activă până la expirarea sigură a sesiunii.
          </p>
        ) : null}
        {!prefill.authenticated ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Poți continua ca vizitator. Dacă ai deja cont, te poți <Link className="font-semibold underline" href="/login?next=/checkout">autentifica</Link> pentru precompletarea adreselor.
          </p>
        ) : null}

        <CheckoutSection number="1" title="Contact și tip client">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={state.fieldErrors.email} label="E-mail" name="email" required type="email" defaultValue={prefill.email} />
            <Field error={state.fieldErrors.phone} label="Telefon" name="phone" required type="tel" defaultValue={prefill.phone} />
          </div>
          <fieldset className="mt-5">
            <legend className="font-semibold">Cumpăr ca</legend>
            <div className="mt-3 flex flex-wrap gap-5">
              <Radio checked={customerType === "individual"} label="Persoană fizică" name="customerType" onChange={() => setCustomerType("individual")} value="individual" />
              <Radio checked={customerType === "company"} label="Companie" name="customerType" onChange={() => setCustomerType("company")} value="company" />
            </div>
            <ErrorText text={state.fieldErrors.customerType} />
          </fieldset>
          {customerType === "company" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field error={state.fieldErrors.companyName} label="Denumire firmă" name="companyName" required />
              <Field error={state.fieldErrors.companyTaxId} label="CUI / CIF" name="companyTaxId" required />
              <Field error={state.fieldErrors.companyRegistrationNumber} label="Nr. Registrul Comerțului (opțional)" name="companyRegistrationNumber" />
            </div>
          ) : null}
        </CheckoutSection>

        <CheckoutSection number="2" title="Adresa de livrare">
          {prefill.addresses.length > 0 ? (
            <label className="mb-5 block text-sm font-semibold text-stone-800">
              Folosește o adresă salvată
              <select
                className={inputClass}
                defaultValue=""
                onChange={(event) => {
                  const address = prefill.addresses.find(({ id }) => id === event.target.value);
                  if (address) setShippingAddress(address);
                }}
              >
                <option value="">Completez manual</option>
                {prefill.addresses.map((address) => <option key={address.id} value={address.id}>{address.label}</option>)}
              </select>
            </label>
          ) : null}
          <AddressFields address={shippingAddress} errors={state.fieldErrors} onChange={setShippingAddress} prefix="shipping" />
        </CheckoutSection>

        <CheckoutSection number="3" title="Facturare">
          <label className="flex items-start gap-3">
            <input checked={billingSame} className="mt-1 size-4 accent-emerald-800" name="billingSameAsShipping" onChange={(event) => setBillingSame(event.target.checked)} type="checkbox" />
            <span>Adresa de facturare este aceeași cu adresa de livrare.</span>
          </label>
          {!billingSame ? <div className="mt-5"><AddressFields address={EMPTY_ADDRESS} errors={state.fieldErrors} prefix="billing" /></div> : null}
        </CheckoutSection>

        <CheckoutSection number="4" title="Livrare și plată">
          {shippingMethods.length > 0 ? (
            <label className="block text-sm font-semibold text-stone-800">
              Metoda de livrare
              <select className={inputClass} defaultValue={shippingMethods[0]?.id} name="shippingMethodId" required>
                {shippingMethods.map((method) => <option key={method.id} value={method.id}>{method.name} — {formatMoney(method.priceMinor)}</option>)}
              </select>
              <ErrorText text={state.fieldErrors.shippingMethodId} />
            </label>
          ) : (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
              Nu există încă o metodă de livrare activă. Checkout-ul poate fi completat după configurarea tarifului în Development.
            </p>
          )}
          <fieldset className="mt-6">
            <legend className="font-semibold">Metoda de plată</legend>
            <div className="mt-3 grid gap-3">
              <Radio checked={paymentMethod === "cash_on_delivery"} label="Ramburs la livrare" name="paymentMethod" onChange={() => setPaymentMethod("cash_on_delivery")} value="cash_on_delivery" />
              <Radio checked={paymentMethod === "card"} label="Card online · Stripe test mode" name="paymentMethod" onChange={() => setPaymentMethod("card")} value="card" />
            </div>
            <ErrorText text={state.fieldErrors.paymentMethod} />
          </fieldset>
        </CheckoutSection>
      </div>

      <aside className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-xl font-semibold">Sumar comandă</h2>
        <ul className="mt-5 grid gap-3 border-b border-stone-200 pb-5 text-sm">
          {lines.map((line) => <li className="flex justify-between gap-4" key={line.key}><span>{line.quantity} × {line.name}</span><span className="font-semibold">{formatMoney(line.unitPriceMinor * line.quantity)}</span></li>)}
        </ul>
        <MoneyRow label="Subtotal estimat" value={subtotalMinor} />
        {state.quote ? (
          <div className="mt-4 border-t border-stone-200 pt-2" data-testid="authoritative-quote">
            <MoneyRow label="Subtotal verificat" value={state.quote.subtotalMinor} />
            <MoneyRow label={state.quote.shippingMethod.name} value={state.quote.shippingMinor} />
            <MoneyRow emphasis label="Total verificat" value={state.quote.totalMinor} />
          </div>
        ) : null}
        {priceChanged ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Prețul unuia sau mai multor produse a fost actualizat de server.</p> : null}
        {state.quote?.errors.length ? (
          <ul className="mt-4 grid gap-2 text-sm text-red-800" role="alert">
            {state.quote.errors.map((error, index) => <li key={`${error.key}-${error.code}-${index}`}>• {error.key && cartLineNames.get(error.key) ? `${cartLineNames.get(error.key)}: ` : ""}{error.message}</li>)}
          </ul>
        ) : null}
        {state.message ? <p className={`mt-5 rounded-2xl p-4 text-sm ${state.success ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-900"}`} data-testid="checkout-result" role="status">{state.message}</p> : null}
        <ErrorText text={state.fieldErrors.cart} />
        <button className="mt-6 min-h-12 w-full rounded-full bg-emerald-900 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600" disabled={!canValidate} type="submit">
          {pending
            ? "Se pregătește în siguranță…"
            : paymentMethod === "card"
              ? "Continuă către plata cu cardul"
              : "Plasează comanda ramburs"}
        </button>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          {paymentMethod === "card"
            ? "Comanda și stocul sunt reverificate înainte de redirect. Numai webhook-ul Stripe verificat poate confirma plata."
            : "Comanda este reverificată și înregistrată atomic. Plata rămâne neachitată până la încasarea rambursului."}
        </p>
        <Link className="mt-4 flex justify-center text-sm font-semibold text-emerald-900 hover:underline" href="/cart">Înapoi la coș</Link>
      </aside>
    </form>
  );
}

function CheckoutSection({ children, number, title }: { children: React.ReactNode; number: string; title: string }) {
  return <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-6 text-xl font-semibold"><span className="mr-3 inline-flex size-8 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-900">{number}</span>{title}</h2>{children}</section>;
}

function AddressFields({ address, errors, onChange, prefix }: { address: CheckoutAddress; errors: Record<string, string>; onChange?: (address: CheckoutAddress) => void; prefix: "shipping" | "billing" }) {
  const update = (key: keyof CheckoutAddress, value: string) => onChange?.({ ...address, [key]: value });
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field controlledValue={onChange ? address.recipientName : undefined} defaultValue={onChange ? undefined : address.recipientName} error={errors[`${prefix}RecipientName`]} label="Nume destinatar" name={`${prefix}RecipientName`} onValue={(value) => update("recipientName", value)} required />
    <Field controlledValue={onChange ? address.phone : undefined} defaultValue={onChange ? undefined : address.phone} error={errors[`${prefix}Phone`]} label="Telefon destinatar" name={`${prefix}Phone`} onValue={(value) => update("phone", value)} required type="tel" />
    <div className="sm:col-span-2"><Field controlledValue={onChange ? address.addressLine1 : undefined} defaultValue={onChange ? undefined : address.addressLine1} error={errors[`${prefix}AddressLine1`]} label="Adresă" name={`${prefix}AddressLine1`} onValue={(value) => update("addressLine1", value)} required /></div>
    <div className="sm:col-span-2"><Field controlledValue={onChange ? address.addressLine2 : undefined} defaultValue={onChange ? undefined : address.addressLine2} error={errors[`${prefix}AddressLine2`]} label="Bloc, scară, apartament (opțional)" name={`${prefix}AddressLine2`} onValue={(value) => update("addressLine2", value)} /></div>
    <Field controlledValue={onChange ? address.city : undefined} defaultValue={onChange ? undefined : address.city} error={errors[`${prefix}City`]} label="Localitate" name={`${prefix}City`} onValue={(value) => update("city", value)} required />
    <Field controlledValue={onChange ? address.county : undefined} defaultValue={onChange ? undefined : address.county} error={errors[`${prefix}County`]} label="Județ" name={`${prefix}County`} onValue={(value) => update("county", value)} required />
    <Field controlledValue={onChange ? address.postalCode : undefined} defaultValue={onChange ? undefined : address.postalCode} error={errors[`${prefix}PostalCode`]} label="Cod poștal (opțional)" name={`${prefix}PostalCode`} onValue={(value) => update("postalCode", value)} />
    <Field controlledValue="RO" error={errors[`${prefix}CountryCode`]} label="Țară" name={`${prefix}CountryCode`} readOnly />
  </div>;
}

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

function Field({ controlledValue, defaultValue, error, label, name, onValue, readOnly, required, type = "text" }: { controlledValue?: string; defaultValue?: string; error?: string; label: string; name: string; onValue?: (value: string) => void; readOnly?: boolean; required?: boolean; type?: string }) {
  const inputId = `checkout-${name}`;
  const errorId = `${inputId}-error`;
  return <div><label className="block text-sm font-semibold text-stone-800" htmlFor={inputId}>{label}</label><input aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} className={`${inputClass} ${error ? "border-red-500" : ""}`} defaultValue={defaultValue} id={inputId} name={name} onChange={onValue ? (event) => onValue(event.target.value) : undefined} readOnly={readOnly} required={required} type={type} value={controlledValue} /><ErrorText id={errorId} text={error} /></div>;
}

function Radio({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex items-center gap-3 rounded-2xl border border-stone-200 p-4"><input className="size-4 accent-emerald-800" type="radio" {...props} /><span>{label}</span></label>;
}

function ErrorText({ id, text }: { id?: string; text?: string }) {
  return text ? <span className="mt-2 block text-sm font-medium text-red-700" id={id} role="alert">{text}</span> : null;
}

function MoneyRow({ emphasis, label, value }: { emphasis?: boolean; label: string; value: number }) {
  return <div className={`mt-3 flex items-center justify-between gap-4 ${emphasis ? "text-lg text-emerald-900" : "text-sm"}`}><span className={emphasis ? "font-semibold" : "text-stone-600"}>{label}</span><strong>{formatMoney(value)}</strong></div>;
}
