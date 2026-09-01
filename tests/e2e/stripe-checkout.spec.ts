import { expect, test } from "@playwright/test";
import Stripe from "stripe";

import {
  CART_STORAGE_KEY,
  createCartLine,
  serializeCart,
} from "../../src/lib/cart/model";

import {
  buildStripeCheckoutSessionParams,
  checkoutSessionExpiresAt,
  STRIPE_CHECKOUT_DURATION_SECONDS,
  stripeSessionIdempotencyKey,
} from "../../src/lib/stripe/checkout";

const paymentId = "61000000-0000-4000-8000-000000000001";
const orderId = "61000000-0000-4000-8000-000000000002";
const confirmationToken = "61000000-0000-4000-8000-000000000003";
const webhookSecret = "whsec_playwright_placeholder";

test("Stripe Session este construită numai din snapshot-ul intern și reprezintă totalul exact", () => {
  const params = buildStripeCheckoutSessionParams({
    appUrl: "http://localhost:3000",
    paymentId,
    expiresAt: 2_000_000_000,
    order: {
      id: orderId,
      confirmationToken,
      email: "stripe-test@example.com",
      currency: "RON",
      subtotalMinor: 4500,
      shippingMinor: 750,
      totalMinor: 5250,
      shippingMethodName: "Curier",
      items: [
        { productName: "Produs snapshot", unitPriceMinor: 2250, quantity: 2 },
      ],
    },
  });

  expect(params.mode).toBe("payment");
  expect(params.payment_method_types).toEqual(["card"]);
  expect(params.line_items).toHaveLength(2);
  expect(params.line_items?.[0]).toMatchObject({
    quantity: 2,
    price_data: {
      currency: "ron",
      unit_amount: 2250,
      product_data: { name: "Produs snapshot" },
    },
  });
  expect(params.line_items?.[1]).toMatchObject({
    quantity: 1,
    price_data: { currency: "ron", unit_amount: 750 },
  });
  expect(params.metadata).toEqual({ order_id: orderId, payment_id: paymentId });
  expect(params.success_url).toContain(confirmationToken);
  expect(params.success_url).toContain("{CHECKOUT_SESSION_ID}");
  expect(params.cancel_url).toBe("http://localhost:3000/checkout?payment=cancelled");
});

test("o neconcordanță între line items și totalul DB oprește Session creation", () => {
  expect(() =>
    buildStripeCheckoutSessionParams({
      appUrl: "http://localhost:3000",
      paymentId,
      expiresAt: 2_000_000_000,
      order: {
        id: orderId,
        confirmationToken,
        email: "stripe-test@example.com",
        currency: "RON",
        subtotalMinor: 4500,
        shippingMinor: 750,
        totalMinor: 1,
        shippingMethodName: "Curier",
        items: [
          { productName: "Produs snapshot", unitPriceMinor: 2250, quantity: 2 },
        ],
      },
    }),
  ).toThrow(/internal order total/i);
});

test("Stripe Session folosește expirare de 30 minute și idempotency fără PII", () => {
  const now = 1_900_000_000_000;
  expect(checkoutSessionExpiresAt(now)).toBe(
    Math.floor(now / 1000) + STRIPE_CHECKOUT_DURATION_SECONDS,
  );
  expect(STRIPE_CHECKOUT_DURATION_SECONDS).toBe(30 * 60);
  expect(stripeSessionIdempotencyKey(paymentId)).toBe(
    `checkout_session:${paymentId}`,
  );
});

test("webhook-ul respinge lipsa semnăturii și semnătura invalidă", async ({ request }) => {
  const missing = await request.post("/api/stripe/webhook", { data: "{}" });
  expect(missing.status()).toBe(400);

  const invalid = await request.post("/api/stripe/webhook", {
    data: "{}",
    headers: { "stripe-signature": "t=1,v1=invalid" },
  });
  expect(invalid.status()).toBe(400);
});

test("un eveniment semnat valid dar irelevant este acceptat fără mutații", async ({ request }) => {
  const stripe = new Stripe("sk_test_playwright_placeholder");
  const payload = JSON.stringify({
    id: "evt_playwright_irrelevant",
    object: "event",
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: "cus_test" } },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "customer.created",
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const response = await request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ received: true, ignored: true });
});

test("cancel URL păstrează coșul și explică faptul că rezervarea rămâne activă", async ({ page }) => {
  const storedCart = serializeCart([
    createCartLine({
      productId: orderId,
      slug: "produs-stripe-cancel",
      name: "Produs Stripe cancel",
      productType: "standard",
      availabilityStatus: "in_stock",
      image: null,
      variant: null,
      customizations: [],
      basePriceMinor: 2000,
      quantity: 1,
    }),
  ]);
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: CART_STORAGE_KEY, value: storedCart },
  );
  await page.goto("/checkout?payment=cancelled");

  await expect(page.getByText(/Plata nu a fost finalizată/)).toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), CART_STORAGE_KEY)).toBe(storedCart);
});
