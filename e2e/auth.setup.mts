import { clerk } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const stateDir = path.join(import.meta.dirname, "..", "playwright", ".clerk");
const credentialsFile = path.join(stateDir, "coach-credentials.json");
const storageFile = path.join(stateDir, "coach-storage.json");

setup("authenticate coach", async ({ page }) => {
  const { email } = JSON.parse(fs.readFileSync(credentialsFile, "utf-8"));

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: storageFile });
});
