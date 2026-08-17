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

export async function generateBracket(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) return;

  const division = await db.division.findUnique({
    where: { id: divisionId },
    include: { event: true },
  });
  if (!division) return;

  const members = await db.approvedAthleteDivision.findMany({
    where: { divisionId },
    select: {
      approvedAthlete: { select: { athleteId: true, chapterId: true } },
    },
  });

  const athletes = members.map((m) => ({ id: m.approvedAthlete.athleteId }));

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

    const chapterIds = [...new Set(members.map((m) => m.approvedAthlete.chapterId))];
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
  revalidatePath(`/admin/brackets/events/${division.eventId}/divisions`);
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
