"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildDivisions,
  generateBracketCells,
  resolveByeWinners,
  athletesInDivision,
  participantsOf,
} from "@/lib/brackets";

export async function generateDivisions(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  const enrollments = await db.enrollment.findMany({
    where: { eventId },
    include: { athlete: true },
  });

  const divisions = buildDivisions(
    event.eventDate.getFullYear(),
    enrollments.map((e) => e.athlete),
  );

  await db.$transaction([
    db.division.deleteMany({ where: { eventId } }),
    db.division.createMany({ data: divisions.map((d) => ({ ...d, eventId })) }),
  ]);

  revalidatePath("/admin/brackets");
  revalidatePath("/dashboard/brackets");
  revalidatePath("/admin");
}

export async function generateBracket(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return;

  const division = await db.division.findUnique({
    where: { id: divisionId },
    include: { event: true },
  });
  if (!division) return;

  const enrollments = await db.enrollment.findMany({
    where: { eventId: division.eventId },
    include: { athlete: true },
    orderBy: { createdAt: "asc" },
  });

  const athletes = athletesInDivision(
    division,
    division.event.eventDate.getFullYear(),
    enrollments.map((e) => e.athlete),
  );

  const cells = resolveByeWinners(generateBracketCells(athletes));
  if (cells.length > 0) {
    await db.$transaction([
      db.bracketCell.deleteMany({ where: { divisionId } }),
      db.bracketCell.createMany({
        data: cells.map((c) => ({ ...c, divisionId })),
      }),
    ]);
  }

  revalidatePath("/admin/brackets");
  revalidatePath(`/admin/brackets/${divisionId}`);
  revalidatePath("/dashboard/brackets");
}

export async function resetBracket(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return;

  await db.bracketCell.deleteMany({ where: { divisionId } });

  revalidatePath("/admin/brackets");
  revalidatePath(`/admin/brackets/${divisionId}`);
  revalidatePath("/dashboard/brackets");
}

export async function recordWinner(formData: FormData): Promise<void> {
  await requireRole("organizer");

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
  const toUpdate = new Set<string>([matchId]);
  const queue = [matchId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    const parent = cells.find((c) => c.childAId === id || c.childBId === id);
    if (parent && parent.winnerAthleteId && !toUpdate.has(parent.id)) {
      toUpdate.add(parent.id);
      queue.push(parent.id);
    }
  }

  await db.$transaction(
    [...toUpdate].map((id) =>
      db.bracketCell.update({
        where: { id },
        data: { winnerAthleteId: id === matchId ? winnerAthleteId : null },
      }),
    ),
  );

  revalidatePath(`/admin/brackets/${divisionId}`);
  revalidatePath("/admin/brackets");
  revalidatePath("/dashboard/brackets");
}

