import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { assertApprovedTestTarget, DEMO_PROJECT_REF } from "./tests/e2e/demo-target";

import { E2E_APP_URL, E2E_SERVER_ENVIRONMENT } from "./tests/e2e/test-environment";

const demoMode = process.env.E2E_DEMO === "1";
if (demoMode) {
  const isolated = parseEnv(readFileSync(".env.e2e-demo.local", "utf8"));
  if (isolated.E2E_APPROVED_PROJECT_REF !== DEMO_PROJECT_REF) throw new Error("Invalid isolated demo environment");
  Object.assign(process.env, isolated);
  assertApprovedTestTarget(process.env.NEXT_PUBLIC_SUPABASE_URL!);
} else {
  loadEnvConfig(process.cwd());
}

const baseURL = E2E_APP_URL;
const testPort = new URL(baseURL).port;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: demoMode ? 180_000 : 60_000,
  workers: demoMode || process.env.CI ? 1 : 6,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: demoMode ? "off" : "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "store-settings",
      testMatch: "**/store-settings.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: "**/store-settings.spec.ts",
      dependencies: ["store-settings"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${testPort}`,
    url: baseURL,
    reuseExistingServer: !demoMode && Boolean(process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER),
    timeout: 120_000,
    env: {
      ...process.env,
      ...E2E_SERVER_ENVIRONMENT,
    },
  },
});
