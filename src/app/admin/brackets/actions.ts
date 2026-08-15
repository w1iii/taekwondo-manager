"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logInfo, reportError } from "@/lib/log";
import {
  generateBracketCells,
  resolveByeWinners,
  participantsOf,
} from "@/lib/brackets";
import { buildDivisions, athletesInDivision } from "@/lib/divisions";
import { getEventEnrollments } from "@/lib/enrollments";
import { EventType } from "@/generated/prisma/client";
const ALL_EVENT_TYPES = [
  EventType.KYORUGI,
  EventType.POOMSAE,
  EventType.FREESTYLE_POOMSAE,
  EventType.BREAKING,
];

export async function generateDivisions(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  const selected = ALL_EVENT_TYPES.filter((t) => formData.get(`eventType:${t}`) === "on");
  const eventTypes = selected.length > 0 ? selected : [EventType.KYORUGI, EventType.POOMSAE];

  const [enrollments, weightClasses] = await Promise.all([
    getEventEnrollments(eventId),
    db.weightClass.findMany({ orderBy: [{ gender: "asc" }, { sortOrder: "asc" }] }),
  ]);

  const divisions = buildDivisions(
    event.eventDate.getFullYear(),
    enrollments.map((e) => e.athlete),
    weightClasses,
    eventTypes,
  );

  try {
    await db.$transaction([
      db.division.deleteMany({ where: { eventId } }),
      db.division.createMany({ data: divisions.map((d) => ({ ...d, eventId })) }),
    ]);
  } catch (error) {
    reportError("generate-divisions-failed", { eventId, actorId: user.userId }, error);
    throw error;
  }

  logInfo("divisions-generated", { eventId, count: divisions.length });
  revalidateTag("events-published", "max");
  revalidateTag("brackets-cells", "max");
  revalidatePath("/admin/brackets");
  revalidatePath(`/admin/brackets/events/${eventId}`);
  revalidatePath("/dashboard/brackets");
  revalidatePath(`/dashboard/brackets/${eventId}`);
  revalidatePath("/admin");
}

export async function generateBracket(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return;

  const division = await db.division.findUnique({
    where: { id: divisionId },
    include: { event: true, weightClass: true },
  });
  if (!division) return;

  const enrollments = await getEventEnrollments(division.eventId);

  const athletes = athletesInDivision(
    {
      gender: division.gender,
      eventType: division.eventType,
      minAge: division.minAge,
      maxAge: division.maxAge,
      beltType: division.beltType,
      weightClass: division.weightClass,
    },
    division.event.eventDate.getFullYear(),
    enrollments.map((e) => e.athlete),
  );

  const cells = resolveByeWinners(generateBracketCells(athletes));
  if (cells.length > 0) {
    try {
      await db.$transaction([
        db.bracketCell.deleteMany({ where: { divisionId } }),
        db.bracketCell.createMany({
          data: cells.map((c) => ({ ...c, divisionId })),
        }),
      ]);
    } catch (error) {
      reportError("generate-bracket-failed", { divisionId, actorId: user.userId }, error);
      throw error;
    }

    const chapterIds = [...new Set(enrollments.map((e) => e.chapterId))];
    await db.notification.createMany({
      data: chapterIds.map((chapterId) => ({
        role: "COACH",
        targetChapterId: chapterId,
        title: "Brackets published",
        body: `${division.name} is live for ${division.event.name}.`,
        link: "/dashboard/brackets",
      })),
    });
  }

  logInfo("bracket-generated", { divisionId, actorId: user.userId, cells: cells.length });
  revalidateTag("brackets-cells", "max");
  revalidatePath("/admin/brackets");
  revalidatePath(`/admin/brackets/events/${division.eventId}`);
  revalidatePath(`/admin/brackets/${divisionId}`);
  revalidatePath("/dashboard/brackets");
  revalidatePath(`/dashboard/brackets/${division.eventId}`);
}

export async function resetBracket(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return;

  const division = await db.division.findUnique({ where: { id: divisionId } });
  if (!division) return;

  await db.bracketCell.deleteMany({ where: { divisionId } });

  revalidateTag("brackets-cells", "max");
  revalidatePath("/admin/brackets");
  revalidatePath(`/admin/brackets/events/${division.eventId}`);
  revalidatePath(`/admin/brackets/${divisionId}`);
  revalidatePath("/dashboard/brackets");
  revalidatePath(`/dashboard/brackets/${division.eventId}`);
}

export async function recordWinner(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const divisionId = String(formData.get("divisionId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const clear = formData.get("clear") === "1";
  if (!divisionId || !matchId) return;

  const division = await db.division.findUnique({ where: { id: divisionId } });
  if (!division) return;

  const cells = await db.bracketCell.findMany({ where: { divisionId } });
  if (cells.length === 0) return;

  const match = cells.find((c) => c.id === matchId);
  if (!match) return;

  let winnerAthleteId: string | null = null;
  if (!clear) {
    const winnerId = String(formData.get("winnerId") ?? "");
    if (!winnerId) return;
    const [a, b] = participantsOf(cells, match);
    if (winnerId !== a && winnerId !== b) return;
    winnerAthleteId = winnerId;
  }

  // Cascade-clear winners downstream (parent and up) so re-deciding an
  // earlier round can never leave a stale result in later rounds.
  // Build a parent lookup once (childId → parent cell) so the walk is O(n).
  const parentByChild = new Map<string, (typeof cells)[number]>();
  for (const cell of cells) {
    if (cell.childAId) parentByChild.set(cell.childAId, cell);
    if (cell.childBId) parentByChild.set(cell.childBId, cell);
  }

  const toUpdate = new Set<string>([matchId]);
  const queue = [matchId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    const parent = parentByChild.get(id);
    if (parent && parent.winnerAthleteId && !toUpdate.has(parent.id)) {
      toUpdate.add(parent.id);
      queue.push(parent.id);
    }
  }

  try {
    await db.$transaction(
      [...toUpdate].map((id) =>
        db.bracketCell.update({
          where: { id },
          data: { winnerAthleteId: id === matchId ? winnerAthleteId : null },
        }),
      ),
    );
  } catch (error) {
    reportError(
      "record-winner-failed",
      { divisionId, matchId, actorId: user.userId },
      error,
    );
    throw error;
  }

  logInfo("winner-recorded", {
    divisionId,
    matchId,
    actorId: user.userId,
    runnerUp: !clear && winnerAthleteId,
  });
  revalidateTag("brackets-cells", "max");
  revalidatePath(`/admin/brackets/${divisionId}`);
  revalidatePath("/admin/brackets");
  revalidatePath(`/admin/brackets/events/${division.eventId}`);
  revalidatePath("/dashboard/brackets");
  revalidatePath(`/dashboard/brackets/${division.eventId}`);
}

