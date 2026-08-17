import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerAthletes } from "@/app/dashboard/events/actions";
import {
  submitPayment,
  cancelPayment,
} from "@/app/dashboard/payments/actions";
import {
  approvePayment,
  rejectPayment,
} from "@/app/admin/payments/actions";
import {
  generateBracket,
  recordWinner,
  resetBracket,
} from "@/app/admin/brackets/actions";
import { createAthlete } from "@/app/dashboard/roster/actions";
import { setEventStatus } from "@/app/admin/events/actions";
import {
  EventStatus,
  ChapterStatus,
  PaymentOutcome,
  Gender,
} from "@/generated/prisma/client";

import {
  resetDb,
  seedAthletes,
  seedChapter,
  seedApprovedAthlete,
  seedEvent,
  seedEventDivisions,
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

function proofFile() {
  return new File([new Uint8Array(1024)], "proof.png", { type: "image/png" });
}

/** Seeds weight classes + a male kyorugi pool on an event; returns the junior key. */
async function seedPool(eventId: string) {
  const [maleWc] = await seedWeightClasses();
  const pool = await seedEventDivisions(eventId, maleWc.id);
  return pool;
}

/** Builds a registerAthletes form with division picks per athlete. */
function registerForm(
  eventId: string,
  athleteIds: string[],
  divisionKey: string,
) {
  const form = new FormData();
  form.set("eventId", eventId);
  for (const id of athleteIds) {
    form.append("athleteId", id);
    form.append(`divisionKey:${id}`, divisionKey);
  }
  return form;
}

/** Creates a live Division and links approved athletes to it. */
async function seedEnrolledDivision(eventId: string, athleteIds: string[]) {
  const [maleWc] = await seedWeightClasses();
  const pool = await seedEventDivisions(eventId, maleWc.id);
  const junior = pool.rows[1];
  const division = await db.division.create({
    data: {
      eventId,
      name: junior.name,
      gender: junior.gender,
      eventType: junior.eventType,
      divisionKey: junior.divisionKey,
      minAge: junior.minAge,
      maxAge: junior.maxAge,
      weightClassId: junior.weightClassId,
      beltType: junior.beltType,
    },
  });
  const approved = await db.approvedAthlete.findMany({
    where: { eventId, athleteId: { in: athleteIds } },
  });
  if (approved.length > 0) {
    await db.approvedAthleteDivision.createMany({
      data: approved.map((a) => ({
        approvedAthleteId: a.id,
        divisionId: division.id,
      })),
    });
  }
  return division;
}

describe("registerAthletes", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("creates an order with athletes and picks their divisions", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 2, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(
      event.id,
      athletes.map((a) => a.id),
      juniorKey,
    );

    const result = await registerAthletes(form);
    expect(result).toEqual({ ok: true });

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
      include: { items: { include: { divisions: true } } },
    });
    expect(order).not.toBeNull();
    expect(order!.items.length).toBe(2);
    expect(order!.status).toBe("PENDING");
    expect(order!.items.every((i) => i.divisions.length === 1)).toBe(true);

    // Live Division materialized from the pool on first registration.
    const live = await db.division.findFirst({
      where: { eventId: event.id, divisionKey: juniorKey },
    });
    expect(live).not.toBeNull();
  });

  it("rejects a division key outside the event pool", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);
    expect(juniorKey).toBeTruthy();

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    form.append(`divisionKey:${athlete.id}`, "POOMSAE|MALE|15/17||WHITE");

    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no longer available/i);
  });

  it("rejects a division the athlete is not eligible for", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { cadetKey } = await seedPool(event.id);

    const form = new FormData();
    form.set("eventId", event.id);
    form.append("athleteId", athlete.id);
    form.append(`divisionKey:${athlete.id}`, cadetKey);

    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not eligible/i);
  });

  it("rejects an event with no available divisions", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();

    const form = registerForm(event.id, [athlete.id], "anything");

    const result = await registerAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no available divisions/i);
  });

  it("rejects athletes that are not on the chapter roster", async () => {
    const chapter = await seedChapter();
    const other = await seedChapter({ headCoachEmail: "other@test.ph" });
    const [own, alien] = [
      (await seedAthletes(chapter.id, 1))[0],
      (await seedAthletes(other.id, 1))[0],
    ];
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [own.id, alien.id], juniorKey);

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
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form1 = registerForm(event.id, [athlete.id], juniorKey);
    await registerAthletes(form1);

    const athletes2 = await seedAthletes(chapter.id, 1, {
      gender: Gender.MALE,
      birthYear: 2005,
    });
    const form2 = registerForm(event.id, [athletes2[0].id], juniorKey);
    const result = await registerAthletes(form2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already have an active order/i);
  });
});

describe("submitPayment", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("creates a pending payment for an order with athletes", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 2, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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

describe("cancelPayment", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("cancels a pending payment and marks order as rejected", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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

    const result = await cancelPayment(payment!.id, "Changed my mind");
    expect(result).toEqual({ ok: true });

    const updated = await db.paymentAttempt.findUnique({ where: { id: payment!.id } });
    expect(updated!.outcome).toBe("REJECTED");
    expect(updated!.rejectionReason).toContain("Changed my mind");

    const updatedOrder = await db.order.findUnique({ where: { id: order!.id } });
    expect(updatedOrder!.status).toBe("REJECTED");
  });

  it("rejects cancellation with empty reason", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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

    const result = await cancelPayment(payment!.id, "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/reason/i);
  });

  it("rejects cancelling an already approved payment", async () => {
    vi.mocked(requireRole).mockResolvedValue(coach as never);
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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

    vi.mocked(requireRole).mockResolvedValue(organizer as never);
    const approveForm = new FormData();
    approveForm.set("id", payment!.id);
    await approvePayment(approveForm);

    vi.mocked(requireRole).mockResolvedValue(coach as never);
    const result = await cancelPayment(payment!.id, "Too late");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/only cancel pending/i);
  });

  it("rejects cancelling payment from another chapter", async () => {
    const chapter = await seedChapter();
    const other = await seedChapter({ headCoachEmail: "other@test.ph" });
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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

    vi.mocked(requireRole).mockResolvedValue({
      ...coach,
      userId: "user-other",
      email: other.headCoachEmail,
    } as never);

    const result = await cancelPayment(payment!.id, "Not mine");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unauthorized/i);
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
    const [athlete] = await seedAthletes(chapter.id, 2, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
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

    // Division pick carried into the bracket phase.
    const approvedDivisions = await db.approvedAthleteDivision.findMany({
      where: { approvedAthleteId: approved[0].id },
      include: { division: true },
    });
    expect(approvedDivisions.length).toBe(1);
    expect(approvedDivisions[0].division.divisionKey).toBe(juniorKey);

    const updatedOrder = await db.order.findUnique({ where: { id: order!.id } });
    expect(updatedOrder!.status).toBe("APPROVED");

    const items = await db.orderItem.findMany({ where: { orderId: order!.id } });
    expect(items.length).toBe(0);
  });
});

describe("rejectPayment", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("rejects payment and notifies coach", async () => {
    vi.mocked(requireRole).mockResolvedValue(coach as never);
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", proofFile());
    await submitPayment(payForm);

    vi.mocked(requireRole).mockResolvedValue(organizer as never);
    const payment = await db.paymentAttempt.findFirst({
      where: { orderId: order!.id },
    });

    const rejectForm = new FormData();
    rejectForm.set("id", payment!.id);
    rejectForm.set("reason", "Invalid proof");
    await rejectPayment(rejectForm);

    const updated = await db.paymentAttempt.findUnique({ where: { id: payment!.id } });
    expect(updated!.outcome).toBe("REJECTED");
    expect(updated!.rejectionReason).toBe("Invalid proof");

    const updatedOrder = await db.order.findUnique({ where: { id: order!.id } });
    expect(updatedOrder!.status).toBe("REJECTED");

    const notifs = await db.notification.findMany({
      where: { targetChapterId: chapter.id, role: "COACH" },
    });
    expect(notifs.length).toBeGreaterThan(0);
  });

  it("rejects payment without reason uses default message", async () => {
    vi.mocked(requireRole).mockResolvedValue(coach as never);
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1, { gender: Gender.MALE });
    const event = await seedEvent();
    const { juniorKey } = await seedPool(event.id);

    const form = registerForm(event.id, [athlete.id], juniorKey);
    await registerAthletes(form);

    const order = await db.order.findFirst({
      where: { eventId: event.id, chapterId: chapter.id },
    });

    const payForm = new FormData();
    payForm.set("orderId", order!.id);
    payForm.set("referenceNo", "4412 9912");
    payForm.set("proof", proofFile());
    await submitPayment(payForm);

    vi.mocked(requireRole).mockResolvedValue(organizer as never);
    const payment = await db.paymentAttempt.findFirst({
      where: { orderId: order!.id },
    });

    const rejectForm = new FormData();
    rejectForm.set("id", payment!.id);
    await rejectPayment(rejectForm);

    const updated = await db.paymentAttempt.findUnique({ where: { id: payment!.id } });
    expect(updated!.outcome).toBe("REJECTED");
    expect(updated!.rejectionReason).toBeNull();
  });
});

describe("generateBracket", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("generates bracket cells from enrolled players and notifies chapters", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    const athleteIds = athletes.map((a) => a.id);
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const division = await seedEnrolledDivision(event.id, athleteIds);

    const bracketForm = new FormData();
    bracketForm.set("divisionId", division.id);
    await generateBracket(bracketForm);

    const cells = await db.bracketCell.findMany({ where: { divisionId: division.id } });
    expect(cells.length).toBeGreaterThan(0);

    const notifications = await db.notification.findMany({
      where: { targetChapterId: chapter.id, role: "COACH" },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("does not create cells for a division with no enrolled players", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const [maleWc] = await seedWeightClasses();
    const pool = await seedEventDivisions(event.id, maleWc.id);
    const junior = pool.rows[1];
    const division = await db.division.create({
      data: {
        eventId: event.id,
        name: junior.name,
        gender: junior.gender,
        eventType: junior.eventType,
        divisionKey: junior.divisionKey,
        minAge: junior.minAge,
        maxAge: junior.maxAge,
        weightClassId: junior.weightClassId,
        beltType: junior.beltType,
      },
    });

    const bracketForm = new FormData();
    bracketForm.set("divisionId", division.id);
    await generateBracket(bracketForm);

    const cells = await db.bracketCell.findMany({ where: { divisionId: division.id } });
    expect(cells.length).toBe(0);

    const notifications = await db.notification.findMany({
      where: { targetChapterId: chapter.id, role: "COACH" },
    });
    expect(notifications.length).toBe(0);
  });
});

describe("resetBracket", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("deletes all bracket cells for a division", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 4, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    const athleteIds = athletes.map((a) => a.id);
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const division = await seedEnrolledDivision(event.id, athleteIds);

    const bracketForm = new FormData();
    bracketForm.set("divisionId", division.id);
    await generateBracket(bracketForm);

    const cellsBefore = await db.bracketCell.findMany({ where: { divisionId: division.id } });
    expect(cellsBefore.length).toBeGreaterThan(0);

    const resetForm = new FormData();
    resetForm.set("divisionId", division.id);
    await resetBracket(resetForm);

    const cellsAfter = await db.bracketCell.findMany({ where: { divisionId: division.id } });
    expect(cellsAfter.length).toBe(0);
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
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    const athleteIds = athletes.map((a) => a.id);
    for (const a of athletes) await seedApprovedAthlete(event.id, chapter.id, a.id);

    const division = await seedEnrolledDivision(event.id, athleteIds);

    const bracketForm = new FormData();
    bracketForm.set("divisionId", division.id);
    await generateBracket(bracketForm);

    const cells = await db.bracketCell.findMany({ where: { divisionId: division.id } });
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
    form.set("divisionId", division.id);
    form.set("matchId", match.id);
    form.set("winnerId", a.athleteId!);
    await recordWinner(form);

    const updated = await db.bracketCell.findUnique({ where: { id: match.id } });
    expect(updated!.winnerAthleteId).toBe(a.athleteId);
  });
});

describe("createAthlete", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates an athlete with an ACTIVE club membership", async () => {
    const chapter = await seedChapter();
    vi.mocked(requireRole).mockResolvedValue({
      userId: coach.userId,
      email: coach.email,
      role: "coach",
      chapterId: chapter.id,
    } as never);

    const form = new FormData();
    form.set("name", "Dani Reyes");
    form.set("gender", "FEMALE");
    form.set("birthYear", "2012");
    form.set("weightKg", "42");
    form.set("beltType", "BLUE");

    const result = await createAthlete(form);
    expect(result.ok).toBe(true);

    const athlete = await db.athlete.findFirst({ where: { name: "Dani Reyes" } });
    expect(athlete).not.toBeNull();

    const membership = await db.athleteClub.findUnique({
      where: {
        athleteId_chapterId: { athleteId: athlete!.id, chapterId: chapter.id },
      },
    });
    expect(membership).not.toBeNull();
    expect(membership!.status).toBe("ACTIVE");
  });
});
