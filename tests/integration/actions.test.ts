import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  registerAthletes,
  removeAthlete,
} from "@/app/dashboard/events/actions";
import { submitPayment } from "@/app/dashboard/payments/actions";
import { approvePayment } from "@/app/admin/payments/actions";
import {
  generateBracket,
  generateDivisions,
  recordWinner,
} from "@/app/admin/brackets/actions";
import { setEventStatus } from "@/app/admin/events/actions";
import { EventStatus, ChapterStatus, PaymentOutcome } from "@/generated/prisma/client";

import {
  resetDb,
  seedAthletes,
  seedChapter,
  seedApprovedAthlete,
  seedEvent,
  seedWeightClasses,
  type TestCoach,
} from "./helpers";

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

describe("registerAthletes", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("creates an order with athletes for a published event", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 2);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    for (const a of athletes) form.append("athleteId", a.id);

    const result = await registerAthletes(form);
    expect(result).toEqual({ ok: true });

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
      include: { items: true },
    });
    expect(order).not.toBeNull();
    expect(order!.items.length).toBe(2);
    expect(order!.status).toBe("PENDING");
  });

  it("rejects athletes that are not on the chapter roster", async () => {
    const chapter = await seedChapter();
    const other = await seedChapter({ headCoachEmail: "other@test.ph" });
    const [own, alien] = [
      (await seedAthletes(chapter.id, 1))[0],
      (await seedAthletes(other.id, 1))[0],
    ];
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", own.id);
    form.append("athleteId", alien.id);

    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not on your roster/i);
  });

  it("rejects a draft event", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 1);
    const event = await seedEvent({ status: EventStatus.DRAFT });

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athletes[0].id);

    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not open for registration/i);
  });

  it("rejects enrollment after the deadline", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 1);
    const event = await seedEvent({
      eventDate: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db.event.update({
      where: { id: event.id },
      data: { registrationDeadline: new Date("2025-01-01T00:00:00.000Z") },
    });

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athletes[0].id);

    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/has closed/i);
  });

  it("requires a chapter to be linked", async () => {
    const event = await seedEvent();
    const form = new FormData();
    form.set("eventId", event.id);
    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
  });

  it("rejects if there is already a pending order", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();

    const form1 = new FormData();
    form1.set("eventId", event.id);
    form1.append("athleteId", athletes[0].id);
    await registerAthletes(form1);

    const athletes2 = await seedAthletes(chapter.id, 1, { birthYear: 2020 });
    const form2 = new FormData();
    form2.set("eventId", event.id);
    form2.append("athleteId", athletes2[0].id);
    const result = await registerAthletes(form2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already have an active order/i);
  });
});

describe("removeAthlete", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("removes an item from a pending order", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();

    await registerAthletes(
      Object.assign(new FormData(), {
        get: () => null,
        getAll: () => [],
      } as unknown as FormData),
    );

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });
    const item = await db.orderItem.findFirst({
      where: { orderId: order!.id },
    });

    const removeForm = new FormData();
    removeForm.set("itemId", item!.id);
    await removeAthlete(removeForm);

    const deleted = await db.orderItem.findUnique({ where: { id: item!.id } });
    expect(deleted).toBeNull();
  });
});

describe("submitPayment", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  function proofFile() {
    return new File([new Uint8Array(1024)], "proof.png", { type: "image/png" });
  }

  it("creates a pending payment for an order with athletes", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 2);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", proofFile());

    const result = await submitPayment(payForm);
    expect(result).toEqual({ ok: true });

    const payment = await db.paymentAttempt.findFirst({
      where: { order: { eventId: event.id, chapterId: chapter.id } },
    });
    expect(payment).not.toBeNull();
    expect(payment!.outcome).toBe(PaymentOutcome.PENDING);
    expect(payment!.amountPesos).toBe(500);
  });

  it("blocks a second submission while the first is pending", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });

    const first = new FormData();
    first.set("orderId", order!.id);
    first.set("referenceNo", "4412 9912");
    first.set("proof", proofFile());
    await submitPayment(first);

    const second = new FormData();
    second.set("orderId", order!.id);
    second.set("referenceNo", "4412 9913");
    second.set("proof", proofFile());
    const result = await submitPayment(second);
    expect(result.ok).toBe(false);
  });

  it("rejects when no athletes are in the order", async () => {
    const chapter = await seedChapter();
    const event = await seedEvent();

    const order = await db.order.create({
      data: {
        eventId: event.id,
        chapterId: chapter.id,
        coachId: chapter.id,
      },
    });

    const form = new FormData();
    form.set("orderId", order.id);
    form.set("referenceNo", "4412 9912");
    form.set("proof", proofFile());

    const result = await submitPayment(form);
    expect(result.ok).toBe(false);
    expect(chapter.id).toBeTruthy();
    if (!result.ok) expect(result.error).toMatch(/register at least one/i);
  });

  it("rejects a non-image proof", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", new File([new Uint8Array(100)], "proof.txt", { type: "text/plain" }));

    const result = await submitPayment(payForm);
    expect(result.ok).toBe(false);
  });
});

describe("approvePayment", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("approves payment and moves athletes to ApprovedAthlete", async () => {
    vi.mocked(requireRole).mockResolvedValue(coach as never);
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 2);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
      include: { items: true },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", new File([new Uint8Array(1024)], "proof.png", { type: "image/png" }));
    await submitPayment(payForm);

    vi.mocked(requireRole).mockResolvedValue(organizer as never);

    const payment = await db.paymentAttempt.findFirst({
      where: { orderId: order!.id },
    });

    const approveForm = new FormData();
    approveForm.set("id", payment!.id);
    await approvePayment(approveForm);

    const approved = await db.approvedAthlete.findMany({
      where: { eventId: event.id, chapterId: chapter.id },
    });
    expect(approved.length).toBe(1);

    const updatedOrder = await db.order.findUnique({ where: { id: order!.id } });
    expect(updatedOrder!.status).toBe("APPROVED");

    const items = await db.orderItem.findMany({ where: { orderId: order!.id } });
    expect(items.length).toBe(0);
  });
});

describe("generateDivisions + generateBracket", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("generates divisions for a published event with approved athletes", async () => {
    await seedWeightClasses();
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const form = new FormData();
    form.set("eventId", event.id);
    form.set("eventType:KYORUGI", "on");
    await generateDivisions(form);

    const divisions = await db.division.findMany({ where: { eventId: event.id } });
    expect(divisions.length).toBeGreaterThan(0);
  });

  it("generates bracket cells for a division and notifies chapters", async () => {
    await seedWeightClasses();
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const divForm = new FormData();
    divForm.set("eventId", event.id);
    divForm.set("eventType:KYORUGI", "on");
    await generateDivisions(divForm);

    const division = await db.division.findFirst({
      where: { eventId: event.id },
      include: { weightClass: true },
    });
    expect(division).not.toBeNull();

    const bracketForm = new FormData();
    bracketForm.set("divisionId", division!.id);
    await generateBracket(bracketForm);

    const cells = await db.bracketCell.findMany({ where: { divisionId: division!.id } });
    expect(cells.length).toBeGreaterThan(0);

    const notifications = await db.notification.findMany({
      where: { targetChapterId: chapter.id },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });
});

describe("recordWinner", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("fans out one notification per approved chapter on publish", async () => {
    await seedChapter();
    await seedChapter({ headCoachEmail: "second@test.ph", name: "Second Dojang" });
    await seedChapter({
      status: ChapterStatus.PENDING,
      headCoachEmail: "pending@test.ph",
      name: "Pending Dojang",
    });
    await seedChapter({
      status: ChapterStatus.REJECTED,
      headCoachEmail: "rejected@test.ph",
      name: "Rejected Dojang",
    });
    const event = await seedEvent({ status: EventStatus.DRAFT });

    const draft = new FormData();
    draft.set("id", event.id);
    draft.set("status", EventStatus.DRAFT);
    await setEventStatus(draft);

    const published = new FormData();
    published.set("id", event.id);
    published.set("status", EventStatus.PUBLISHED);
    await setEventStatus(published);

    const notifs = await db.notification.findMany({ where: { role: "COACH" } });
    expect(notifs).toHaveLength(2);
    expect(notifs.every((n) => n.title === "Registration open")).toBe(true);
    expect(notifs.every((n) => n.link === "/dashboard/events")).toBe(true);
  });

  it("records a winner and cascades a clear downstream", async () => {
    await seedWeightClasses();
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const divForm = new FormData();
    divForm.set("eventId", event.id);
    divForm.set("eventType:KYORUGI", "on");
    await generateDivisions(divForm);

    const division = await db.division.findFirst({ where: { eventId: event.id } });
    expect(division).not.toBeNull();

    const bracketForm = new FormData();
    bracketForm.set("divisionId", division!.id);
    await generateBracket(bracketForm);

    const cells = await db.bracketCell.findMany({ where: { divisionId: division!.id } });
    const match = cells.find((c) => {
      if (!c.childAId || !c.childBId || c.athleteId) return false;
      const childA = cells.find((cell) => cell.id === c.childAId)!;
      const childB = cells.find((cell) => cell.id === c.childBId)!;
      return Boolean(childA.athleteId && childB.athleteId);
    })!;
    expect(match).toBeTruthy();
    const a = cells.find((c) => c.id === match.childAId)!;
    expect(a.athleteId).toBeTruthy();

    const form = new FormData();
    form.set("divisionId", division!.id);
    form.set("matchId", match.id);
    form.set("winnerId", a.athleteId!);
    await recordWinner(form);

    const updated = await db.bracketCell.findUnique({ where: { id: match.id } });
    expect(updated!.winnerAthleteId).toBe(a.athleteId);
  });
});
