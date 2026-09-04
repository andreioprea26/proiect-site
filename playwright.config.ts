import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

import { E2E_APP_URL, E2E_SERVER_ENVIRONMENT } from "./tests/e2e/test-environment";

loadEnvConfig(process.cwd());

const baseURL = E2E_APP_URL;
const testPort = new URL(baseURL).port;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  workers: process.env.CI ? 1 : 6,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${testPort}`,
    url: baseURL,
    reuseExistingServer: Boolean(process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER),
    timeout: 120_000,
    env: {
      ...process.env,
      ...E2E_SERVER_ENVIRONMENT,
    },
  },
});
