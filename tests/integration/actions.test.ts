import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  enrollAthletes,
  unenrollAthlete,
} from "@/app/dashboard/events/actions";
import { submitPayment } from "@/app/dashboard/payments/actions";
import {
  generateBracket,
  generateDivisions,
  recordWinner,
} from "@/app/admin/brackets/actions";
import { EventStatus, PaymentStatus } from "@/generated/prisma/client";

import {
  resetDb,
  seedAthletes,
  seedChapter,
  seedEnrollment,
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

describe("enrollAthletes", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("enrolls owned athletes into a published event", async () => {
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 2);
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
    for (const a of athletes) form.append("athleteId", a.id);

    const result = await enrollAthletes(form);
    expect(result).toEqual({ ok: true });

    const rows = await db.enrollment.findMany({ where: { eventId: event.id } });
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.chapterId === chapter.id)).toBe(true);
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

    const result = await enrollAthletes(form);
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

    const result = await enrollAthletes(form);
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

    const result = await enrollAthletes(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/has closed/i);
  });

  it("requires a chapter to be linked", async () => {
    const event = await seedEvent();
    const form = new FormData();
    form.set("eventId", event.id);
    const result = await enrollAthletes(form);
    expect(result.ok).toBe(false);
  });
});

describe("unenrollAthlete", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(coach as never);
  });

  it("removes an enrollment the chapter owns", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();
    const enrollment = await seedEnrollment(event.id, chapter.id, athlete.id);

    const form = new FormData();
    form.set("id", enrollment.id);
    await unenrollAthlete(form);

    const left = await db.enrollment.count({ where: { id: enrollment.id } });
    expect(left).toBe(0);
  });

  it("does not remove an enrollment of another chapter", async () => {
    const chapter = await seedChapter();
    const other = await seedChapter({ headCoachEmail: "other@test.ph" });
    const [athlete] = await seedAthletes(other.id, 1);
    const event = await seedEvent();
    const enrollment = await seedEnrollment(event.id, other.id, athlete.id);

    const form = new FormData();
    form.set("id", enrollment.id);
    await unenrollAthlete(form);

    expect(chapter.id).not.toBe(other.id);
    expect(await db.enrollment.count({ where: { id: enrollment.id } })).toBe(1);
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

  it("creates a pending payment for a chapter with enrolled athletes", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 2);
    const event = await seedEvent();
    await seedEnrollment(event.id, chapter.id, athlete.id);

    const form = new FormData();
    form.set("eventId", event.id);
    form.set("referenceNo", "4412 9912");
    form.set("proof", proofFile());

    const result = await submitPayment(form);
    expect(result).toEqual({ ok: true });

    const payment = await db.teamPayment.findUnique({
      where: { eventId_chapterId: { eventId: event.id, chapterId: chapter.id } },
    });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe(PaymentStatus.PENDING);
    expect(payment!.amountPesos).toBe(500); // 1 enrolled athlete × ₱500
  });

  it("blocks a second submission while the first is pending", async () => {
    const chapter = await seedChapter();
    const [athlete] = await seedAthletes(chapter.id, 1);
    const event = await seedEvent();
    await seedEnrollment(event.id, chapter.id, athlete.id);

    const first = new FormData();
    first.set("eventId", event.id);
    first.set("referenceNo", "4412 9912");
    first.set("proof", proofFile());
    await submitPayment(first);

    const second = new FormData();
    second.set("eventId", event.id);
    second.set("referenceNo", "4412 9913");
    second.set("proof", proofFile());
    const result = await submitPayment(second);
    expect(result.ok).toBe(false);
  });

  it("rejects when no athletes are enrolled", async () => {
    const chapter = await seedChapter();
    const event = await seedEvent();

    const form = new FormData();
    form.set("eventId", event.id);
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
    await seedEnrollment(event.id, chapter.id, athlete.id);

    const form = new FormData();
    form.set("eventId", event.id);
    form.set("referenceNo", "4412 9912");
    form.set("proof", new File([new Uint8Array(100)], "proof.txt", { type: "text/plain" }));

    const result = await submitPayment(form);
    expect(result.ok).toBe(false);
  });
});

describe("generateDivisions + generateBracket", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(requireRole).mockResolvedValue(organizer as never);
  });

  it("generates divisions for a published event with enrollments", async () => {
    await seedWeightClasses();
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    for (const a of athletes) await seedEnrollment(event.id, chapter.id, a.id);

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
    for (const a of athletes) await seedEnrollment(event.id, chapter.id, a.id);

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

  it("records a winner and cascades a clear downstream", async () => {
    await seedWeightClasses();
    const chapter = await seedChapter();
    const athletes = await seedAthletes(chapter.id, 6, { gender: "MALE", birthYear: 2011 });
    const event = await seedEvent();
    for (const a of athletes) await seedEnrollment(event.id, chapter.id, a.id);

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
    // First-round match with two real athletes fed in (both children hold
    // athleteIds). Semi-final cells also match "two children, no athleteId",
    // but their children are matches, not athletes — so filter on that too.
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
