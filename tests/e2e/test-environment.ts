export const E2E_STRIPE_SECRET_KEY = "sk_test_playwright_placeholder";
export const E2E_STRIPE_WEBHOOK_SECRET = "whsec_playwright_placeholder";

export const E2E_SERVER_ENVIRONMENT = {
  STRIPE_SECRET_KEY: E2E_STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: E2E_STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY: "",
  RESEND_FROM_EMAIL: "",
  RESEND_REPLY_TO_EMAIL: "",
  EMAIL_DELIVERY_MODE: "redirect",
  EMAIL_TEST_RECIPIENT: "",
} as const;
