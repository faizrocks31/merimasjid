import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "auth",
      testMatch: "**/global-setup.ts",
      use: { browserName: "chromium" },
    },
    {
      name: "login-tests",
      testMatch: "**/login-check.spec.ts",
      use: {
        browserName: "chromium",
        storageState: { cookies: [], origins: [] }, // No auth state for login tests
      },
    },
    {
      name: "e2e",
      testIgnore: ["**/login-check.spec.ts", "**/global-setup.ts"],
      use: {
        browserName: "chromium",
        storageState: "e2e/auth-state.json",
      },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
});