import { defineConfig, devices } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "3107";
const externalURL = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: externalURL ?? `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: externalURL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        env: {
          NEXT_DIST_DIR: ".next-playwright",
          // Use the Next.js proxy so the E2E origin does not depend on backend CORS.
          NEXT_PUBLIC_API_URL: "/api",
        },
        url: `http://localhost:${port}`,
        reuseExistingServer: false,
        timeout: 120000,
      },
});
