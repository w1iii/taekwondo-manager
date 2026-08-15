import { clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

import { resetDb, seedPublishedEvent, seedWeightClasses } from "./helpers/db.mts";

setup.describe.configure({ mode: "serial" });

const stateDir = path.join(import.meta.dirname, "..", "playwright", ".clerk");
const usersFile = path.join(stateDir, "created-users.json");

// Unique per run so consecutive runs don't collide in the Clerk dev instance.
const COACH_EMAIL = `e2e-coach-${Date.now()}+clerk_test@example.com`;
const COACH_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD ?? "E2ePass!234567890";

setup("global setup", async () => {
  await clerkSetup({ dotenv: false });

  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  const coach = await client.users.createUser({
    emailAddress: [COACH_EMAIL],
    password: COACH_PASSWORD,
    firstName: "E2E",
    lastName: "Coach",
  });

  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    usersFile,
    JSON.stringify([{ userId: coach.id, email: COACH_EMAIL }]),
  );
  fs.writeFileSync(
    path.join(stateDir, "coach-credentials.json"),
    JSON.stringify({ email: COACH_EMAIL, password: COACH_PASSWORD }),
  );

  await resetDb();
  await seedWeightClasses();
  await seedPublishedEvent();
});
