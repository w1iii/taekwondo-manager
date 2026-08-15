import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { config as loadEnv } from "dotenv";

// Load real Clerk dev keys (sk_test_/pk_test_) for the global setup + auth.
// Test DB overrides DATABASE_URL; empty CLOUDINARY_URL forces local uploads.
loadEnv({ path: path.join(__dirname, ".env.local") });

const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://wii@localhost:5432/taekwondo_test";

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.CLOUDINARY_URL = "";
process.env.ALLOW_LOCAL_UPLOADS = "true";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

const storageFile = path.join(__dirname, "playwright", ".clerk", "coach-storage.json");

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  outputDir: path.join(__dirname, "test-results"),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      CLOUDINARY_URL: "",
      ALLOW_LOCAL_UPLOADS: "true",
    },
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "global setup",
      testMatch: /global\.setup\.mts/,
      teardown: "global teardown",
    },
    {
      name: "global teardown",
      testMatch: /global\.teardown\.mts/,
    },
    {
      name: "auth",
      testMatch: /auth\.setup\.mts/,
      dependencies: ["global setup"],
    },
    {
      name: "coach flow",
      testMatch: /coach-flow\.spec\.mts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: storageFile,
      },
      dependencies: ["global setup", "auth"],
    },
  ],
});
