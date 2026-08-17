import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerAthletes } from "@/app/dashboard/events/actions";
import { submitPayment } from "@/app/dashboard/payments/actions";
import { GET } from "@/app/api/payments/[id]/proof/route";

import {
  resetDb,
  seedAthletes,
  seedChapter,
  seedEvent,
  seedPool,
  type TestCoach,
} from "./helpers";

vi.mock("@/lib/uploads", () => ({
  getStoredFile: vi.fn().mockResolvedValue({
    data: Buffer.from("fake-image-data"),
    contentType: "image/png",
  }),
  saveUpload: vi.fn().mockResolvedValue("local://proofs/test.png"),
  deleteUpload: vi.fn(),
}));

const coach: TestCoach = {
  userId: "user-coach-1",
  email: "coach@test.ph",
  role: "coach",
};

const organizer: TestCoach = {
  userId: "user-org-1",
  email: "org@test.ph",
  role: "organizer",
};

function proofFile() {
  return new File([new Uint8Array(1024)], "proof.png", { type: "image/png" });
}

describe("GET /api/payments/[id]/proof", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns 401 for unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const request = new Request("http://localhost/api/payments/fake-id/proof");
    const response = await GET(request, { params: Promise.resolve({ id: "fake-id" }) });

    expect(response.status).toBe(401);
  });

  it("returns proof image for organizer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: organizer.userId,
      role: organizer.role,
    } as never);

    vi.mocked(requireRole).mockResolvedValue(coach as never);
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    const { juniorKey } = await seedPool(event.id);
    form.append(`divisionKey:${athlete.id}`, juniorKey);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", proofFile());
    await submitPayment(payForm);

    const payment = await db.paymentAttempt.findFirst({
      where: { orderId: order!.id },
    });

    const request = new Request(`http://localhost/api/payments/${payment!.id}/proof`);
    const response = await GET(request, {
      params: Promise.resolve({ id: payment!.id }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("private");
  });

  it("returns 404 for non-existent payment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: organizer.userId,
      role: organizer.role,
    } as never);

    const request = new Request("http://localhost/api/payments/nonexistent/proof");
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 for coach accessing other chapter payment", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: coach.userId,
      role: coach.role,
    } as never);

    const chapter = await seedChapter();
    const otherChapter = await seedChapter({ headCoachEmail: "other@test.ph" });

    vi.mocked(requireRole).mockResolvedValue({
      ...coach,
      email: otherChapter.headCoachEmail,
    } as never);

    const [athlete] = await seedAthletes(otherChapter.id, 1);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    const { juniorKey } = await seedPool(event.id);
    form.append(`divisionKey:${athlete.id}`, juniorKey);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: otherChapter.id },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", proofFile());
    await submitPayment(payForm);

    const payment = await db.paymentAttempt.findFirst({
      where: { orderId: order!.id },
    });

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: coach.userId,
      role: coach.role,
      chapterId: chapter.id,
    } as never);

    const request = new Request(`http://localhost/api/payments/${payment!.id}/proof`);
    const response = await GET(request, {
      params: Promise.resolve({ id: payment!.id }),
    });

    expect(response.status).toBe(403);
  });
});
