"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { EVENT_ENROLLMENTS_TAG } from "@/lib/enrollments";
import { parseAthleteFormData, type AthleteFormState } from "@/lib/athletes";

export async function createAthlete(formData: FormData): Promise<AthleteFormState> {
  const user = await requireRole("coach");

  const withinLimit = await checkRateLimit(`create-athlete:${user.userId}`, 30, 60_000);
  if (!withinLimit) {
    return { ok: false, error: "Too many athlete additions. Try again in a minute." };
  }

  const parsed = parseAthleteFormData(formData);
  if (!parsed.ok) return parsed;

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return { ok: false, error: "Link your chapter before managing a roster." };
  }

  await db.athlete.create({
    data: { ...parsed.data, chapterId: chapter.id },
  });

  revalidatePath("/dashboard/roster");
  return { ok: true };
}

export async function updateAthlete(formData: FormData): Promise<AthleteFormState> {
  const user = await requireRole("coach");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing athlete id." };

  const parsed = parseAthleteFormData(formData);
  if (!parsed.ok) return parsed;

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return { ok: false, error: "Link your chapter before managing a roster." };
  }

  const result = await db.athlete.updateMany({
    where: { id, chapterId: chapter.id },
    data: parsed.data,
  });
  if (result.count === 0) {
    return { ok: false, error: "Athlete not found on your roster." };
  }

  revalidatePath("/dashboard/roster");
  return { ok: true };
}

export async function deleteAthlete(formData: FormData): Promise<void> {
  const user = await requireRole("coach");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const chapter = await getChapterForUser(user);
  if (!chapter) return;

  await db.$transaction([
    db.enrollment.deleteMany({
      where: { athleteId: id, chapterId: chapter.id },
    }),
    db.athlete.deleteMany({
      where: { id, chapterId: chapter.id },
    }),
  ]);

  revalidatePath("/dashboard/roster");
  revalidateTag(EVENT_ENROLLMENTS_TAG, "max");
}
