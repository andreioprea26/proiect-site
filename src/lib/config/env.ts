export type PublicEnvironmentVariableName = `NEXT_PUBLIC_${string}`;

function readRequiredEnvironmentVariable(
  name: string,
  value: string | undefined = process.env[name],
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicEnvironmentVariables() {
  return {
    url: readRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: readRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function readRequiredPublicEnvironmentVariable(
  name: PublicEnvironmentVariableName,
): string {
  return readRequiredEnvironmentVariable(name);
}

export function readRequiredServerEnvironmentVariable(name: string): string {
  if (name.startsWith("NEXT_PUBLIC_")) {
    throw new Error(
      `Server-only environment variable must not use the NEXT_PUBLIC_ prefix: ${name}`,
    );
  }

  return readRequiredEnvironmentVariable(name);
}

export function getSupabaseServiceRoleKey(): string {
  return readRequiredEnvironmentVariable(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getStripeSecretKey(): string {
  return readRequiredEnvironmentVariable(
    "STRIPE_SECRET_KEY",
    process.env.STRIPE_SECRET_KEY,
  );
}

export function getStripeWebhookSecretValue(): string {
  return readRequiredEnvironmentVariable(
    "STRIPE_WEBHOOK_SECRET",
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export function getAppUrl(): string {
  return readRequiredEnvironmentVariable("APP_URL", process.env.APP_URL);
}
