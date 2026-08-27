import "server-only";

import Stripe from "stripe";

import { readRequiredServerEnvironmentVariable } from "@/lib/config/env";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = readRequiredServerEnvironmentVariable("STRIPE_SECRET_KEY");
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode key.");
  }

  stripeClient = new Stripe(secretKey, {
    appInfo: {
      name: "Brand Handmade",
      version: "0.1.0",
    },
  });
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  const secret = readRequiredServerEnvironmentVariable(
    "STRIPE_WEBHOOK_SECRET",
  );
  if (!secret.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be a Stripe webhook secret.");
  }
  return secret;
}
