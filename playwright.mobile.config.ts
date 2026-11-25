import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/mobile",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: "auth",
      testMatch: "**/global-setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile-320",
      testIgnore: ["**/global-setup.ts"],
      use: {
        ...devices["Galaxy S9+"],
        viewport: { width: 320, height: 720 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        storageState: "e2e/auth-state.json",
      },
    },
    {
      name: "Mobile-360",
      testIgnore: ["**/global-setup.ts"],
      use: {
        ...devices["Galaxy S9+"],
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        storageState: "e2e/auth-state.json",
      },
    },
    {
      name: "Mobile-390",
      testIgnore: ["**/global-setup.ts"],
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        storageState: "e2e/auth-state.json",
      },
    },
    {
      name: "Mobile-430",
      testIgnore: ["**/global-setup.ts"],
      use: {
        ...devices["iPhone 14 Pro Max"],
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        storageState: "e2e/auth-state.json",
      },
    },
    {
      name: "Tablet-768",
      testIgnore: ["**/global-setup.ts"],
      use: {
        ...devices["iPad (gen 7)"],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        storageState: "e2e/auth-state.json",
      },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
});