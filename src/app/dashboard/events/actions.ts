"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { EVENT_REGISTRATIONS_TAG } from "@/lib/enrollments";
import { EventStatus } from "@/generated/prisma/client";

export type RegisterState = { ok: true } | { ok: false; error: string };

export async function registerAthletes(formData: FormData): Promise<RegisterState> {
  const user = await requireRole("coach");

  const withinLimit = await checkRateLimit(`register:${user.userId}`, 20, 60_000);
  if (!withinLimit) {
    return { ok: false, error: "Too many requests. Try again in a minute." };
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

  const existingPending = await db.order.findFirst({
    where: {
      eventId,
      chapterId: chapter.id,
      status: { in: ["PENDING", "PAID"] },
    },
  });

  if (existingPending) {
    return {
      ok: false,
      error: "You already have an active order. Complete or cancel it before creating a new one.",
    };
  }

  await db.order.create({
    data: {
      eventId,
      coachId: chapter.id,
      chapterId: chapter.id,
      items: {
        create: athleteIds.map((athleteId) => ({ athleteId })),
      },
    },
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidateTag(EVENT_REGISTRATIONS_TAG, "max");
  return { ok: true };
}

export async function removeAthlete(formData: FormData): Promise<void> {
  const user = await requireRole("coach");

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;

  const chapter = await getChapterForUser(user);
  if (!chapter) return;

  const item = await db.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });
  if (!item || item.order.chapterId !== chapter.id) return;

  if (item.order.status !== "PENDING") return;

  await db.orderItem.delete({ where: { id: itemId } });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${item.order.eventId}`);
  revalidateTag(EVENT_REGISTRATIONS_TAG, "max");
}
