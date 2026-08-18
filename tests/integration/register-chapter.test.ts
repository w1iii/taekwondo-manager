import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerChapter } from "@/app/register-chapter/actions";
import { ChapterStatus } from "@/generated/prisma/client";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

import { resetDb, seedChapter } from "./helpers";

const coach = {
  userId: "user-coach-register-1",
  email: "new-coach@test.ph",
  role: "coach",
};

function registrationForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("name", "New Dojang");
  form.set("province", "Negros Occidental");
  form.set("city", "Bacolod");
  form.set("gcashNumber", "09220001111");
  form.set("headCoachName", "New Coach");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

describe("registerChapter", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireUser).mockResolvedValue(coach as never);
  });

  it("creates a PENDING chapter", async () => {
    const result = await registerChapter({ ok: false, error: "" }, registrationForm());
    expect(result.ok).toBe(true);

    const chapter = await db.chapter.findFirst({ where: { headCoachEmail: coach.email } });
    expect(chapter).not.toBeNull();
    expect(chapter!.gcashNumber).toBe("09220001111");
    expect(chapter!.status).toBe(ChapterStatus.PENDING);
  });

  it("rejects a GCash number already used by an active chapter", async () => {
    await seedChapter({ gcashNumber: "09220001111", status: ChapterStatus.APPROVED });

    const result = await registerChapter({ ok: false, error: "" }, registrationForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already registered to another chapter/i);
  });

  it("rejects a GCash number used by a PENDING chapter", async () => {
    await seedChapter({ gcashNumber: "09220001111", status: ChapterStatus.PENDING });

    const result = await registerChapter({ ok: false, error: "" }, registrationForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already registered to another chapter/i);
  });

  it("frees the GCash number once the chapter is REJECTED", async () => {
    await seedChapter({ gcashNumber: "09220001111", status: ChapterStatus.REJECTED });

    const result = await registerChapter({ ok: false, error: "" }, registrationForm());
    expect(result.ok).toBe(true);
  });
});
