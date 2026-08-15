"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { EVENT_ENROLLMENTS_TAG } from "@/lib/enrollments";
import { EventStatus, PaymentStatus } from "@/generated/prisma/client";

export type EnrollState = { ok: true } | { ok: false; error: string };

export async function enrollAthletes(formData: FormData): Promise<EnrollState> {
  const user = await requireRole("coach");

  const withinLimit = await checkRateLimit(`enroll:${user.userId}`, 20, 60_000);
  if (!withinLimit) {
    return { ok: false, error: "Too many enrollments. Try again in a minute." };
  }

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { ok: false, error: "Missing event." };

  const athleteIds = formData
    .getAll("athleteId")
    .map((v) => String(v))
    .filter((v) => v.length > 0);
  if (athleteIds.length === 0) {
    return { ok: false, error: "Pick at least one athlete to register." };
  }

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return { ok: false, error: "Link your chapter before registering for events." };
  }

  const event = await db.event.findFirst({
    where: { id: eventId, status: EventStatus.PUBLISHED },
  });
  if (!event) {
    return { ok: false, error: "That event is not open for registration." };
  }
  if (new Date().getTime() > event.registrationDeadline.getTime()) {
    return { ok: false, error: "Registration for this event has closed." };
  }

  const owned = await db.athlete.count({
    where: { id: { in: athleteIds }, chapterId: chapter.id },
  });
  if (owned !== athleteIds.length) {
    return { ok: false, error: "One or more athletes are not on your roster." };
  }

  await db.enrollment.createMany({
    data: athleteIds.map((athleteId) => ({
      eventId,
      athleteId,
      chapterId: chapter.id,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidateTag(EVENT_ENROLLMENTS_TAG, "max");
  return { ok: true };
}

export async function unenrollAthlete(formData: FormData): Promise<void> {
  const user = await requireRole("coach");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const chapter = await getChapterForUser(user);
  if (!chapter) return;

  const enrollment = await db.enrollment.findUnique({ where: { id } });
  if (!enrollment || enrollment.chapterId !== chapter.id) return;

  const payment = await db.teamPayment.findUnique({
    where: { eventId_chapterId: { eventId: enrollment.eventId, chapterId: chapter.id } },
  });
  if (payment && payment.status !== PaymentStatus.REJECTED) {
    return;
  }

  await db.enrollment.deleteMany({
    where: { id, chapterId: chapter.id },
  });

  revalidatePath("/dashboard/events");
  revalidateTag(EVENT_ENROLLMENTS_TAG, "max");
}
