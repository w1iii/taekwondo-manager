import { test, expect } from "@playwright/test";

import {
  approveChapterByEmail,
  approvePayment,
  db,
  seedDivisionAndBracket,
} from "./helpers/db.mts";

// Coach flow end-to-end: register chapter → (organizer approves) → add athlete
// → enroll in event → submit payment → (organizer approves + draws) → view bracket.
// Organizer-side steps are simulated with direct DB writes so the test stays
// focused on the coach UI; the admin flows are covered by integration tests.
test.describe.configure({ mode: "serial" });

let coachEmail: string;
let chapterId: string;
let eventId: string;
let athleteId: string;
const ATHLETE_NAME = "Andres E2E";
const PROOF_REFERENCE = "4412 9912 0193";

test.beforeAll(async () => {
  const event = await db.event();
  if (!event) throw new Error("No event seeded");
  eventId = event.id;
});

test("coach registers the chapter", async ({ page }) => {
  await page.goto("/register-chapter");

  await expect(page).toHaveURL(/\/register-chapter/);
  await page.locator("#name").fill("E2E Dojang");
  await page.locator("#province").selectOption({ label: "Negros Occidental" });
  await page.locator("#city").fill("Bacolod City");
  await page.locator("#gcashNumber").fill("09171234567");
  await page.locator("#headCoachName").fill("Andres Test");

  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page.getByText("Registration submitted.")).toBeVisible();

  const chapter = await db.chapter("e2e-coach-");
  expect(chapter?.status).toBe("PENDING");
});

test("organizer approval claims the chapter on next dashboard visit", async ({ page }) => {
  const chapter = await db.chapter("e2e-coach-");
  if (!chapter) throw new Error("No chapter found");
  chapterId = chapter.id;
  coachEmail = (await db.chapterEmail(chapter.id))!;

  await approveChapterByEmail(coachEmail);

  // First visit runs claimChapterForUser, which writes the chapterId to Clerk
  // metadata. Reload so this request reads the freshly-linked chapter.
  await page.goto("/dashboard");
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("E2E Dojang")).toBeVisible();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
});

test("coach adds an athlete to the roster", async ({ page }) => {
  await page.goto("/dashboard/roster");
  await expect(page).toHaveURL(/\/dashboard\/roster/);

  await page.locator("#name").fill(ATHLETE_NAME);
  await page.locator("#gender").selectOption({ label: "Male" });
  await page.locator("#birthYear").fill("2010");
  await page.locator("#weightKg").fill("50");
  await page.locator("#beltType").selectOption({ label: "Blue" });

  await page.getByRole("button", { name: "Add athlete" }).click();

  await expect(page.getByText(ATHLETE_NAME)).toBeVisible();
  const athlete = await db.athlete(chapterId, ATHLETE_NAME);
  expect(athlete?.id).toBeTruthy();
  athleteId = athlete!.id;
});

test("coach enrolls the athlete in the event", async ({ page }) => {
  await page.goto("/dashboard/events");
  await expect(page).toHaveURL(/\/dashboard\/events/);

  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\//);

  await page.getByText(ATHLETE_NAME).click();
  await page.getByRole("button", { name: "Register selected athletes" }).click();

  await expect(page.getByText("Registered · 1")).toBeVisible();
  await expect(page.getByText(ATHLETE_NAME)).toBeVisible();

  const enrollment = await db.enrollment(eventId, athleteId);
  expect(enrollment).toBeTruthy();
});

test("coach submits the team payment", async ({ page }) => {
  await page.goto("/dashboard/payments");
  await expect(page).toHaveURL(/\/dashboard\/payments/);

  await page.getByLabel(/GCash reference number/).fill(PROOF_REFERENCE);
  await page
    .locator('input[name="proof"]')
    .setInputFiles({
      name: "proof.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });

  await page.getByRole("button", { name: "Submit payment" }).click();

  await expect(page.getByText("Pending review")).toBeVisible();

  const payment = await db.teamPayment(eventId, chapterId);
  expect(payment?.status).toBe("PENDING");
  expect(payment?.referenceNo).toBe(PROOF_REFERENCE);
});

test("coach views the published bracket", async ({ page }) => {
  await approvePayment(chapterId, eventId);

  const secondAthlete = await db.createAthlete(chapterId, "Jose E2E", "MALE", 2011, 45);
  await db.createEnrollment(eventId, chapterId, secondAthlete.id);

  await seedDivisionAndBracket(eventId, [athleteId, secondAthlete.id]);

  await page.goto("/dashboard/brackets");
  await expect(page).toHaveURL(/\/dashboard\/brackets/);

  await page.getByRole("link", { name: "View" }).click();
  await expect(page).toHaveURL(/\/dashboard\/brackets\/.+/);

  await expect(page.getByText("Kyorugi Male Junior Open")).toBeVisible();
  await expect(page.getByText(ATHLETE_NAME)).toBeVisible();
  await expect(page.getByText("Jose E2E")).toBeVisible();
});
