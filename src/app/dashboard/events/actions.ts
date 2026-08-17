"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { availableDivisionsForAthlete } from "@/lib/divisions";
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

  const pool = await db.eventDivision.findMany({
    where: { eventId },
    include: { weightClass: true },
  });
  if (pool.length === 0) {
    return { ok: false, error: "This event has no available divisions yet." };
  }
  const poolByKey = new Map(pool.map((d) => [d.divisionKey, d]));

  const athletes = await db.athlete.findMany({
    where: { id: { in: athleteIds }, chapterId: chapter.id },
  });
  const athleteById = new Map(athletes.map((a) => [a.id, a]));
  const year = event.eventDate.getFullYear();

  const postings: { athleteId: string; divisionKeys: Set<string> }[] = [];
  for (const athleteId of athleteIds) {
    const keys = new Set(
      formData
        .getAll(`divisionKey:${athleteId}`)
        .map((v) => String(v))
        .filter((k) => k.length > 0),
    );
    if (keys.size === 0) {
      return { ok: false, error: "Pick at least one division per athlete." };
    }

    const athlete = athleteById.get(athleteId);
    if (!athlete) {
      return { ok: false, error: "One or more athletes are not on your roster." };
    }

    const eligible = new Set(
      availableDivisionsForAthlete(athlete, year, pool).map((o) => o.divisionKey),
    );
    for (const key of keys) {
      if (!poolByKey.has(key)) {
        return { ok: false, error: "One or more selected divisions are no longer available." };
      }
      if (!eligible.has(key)) {
        return { ok: false, error: `${athlete.name} is not eligible for every selected division.` };
      }
    }
    postings.push({ athleteId, divisionKeys: keys });
  }

  const allKeys = [...new Set(postings.flatMap((p) => [...p.divisionKeys]))];

  const liveByKey = new Map<string, { id: string }>();
  const existing = await db.division.findMany({
    where: { eventId, divisionKey: { in: allKeys } },
    select: { id: true, divisionKey: true },
  });
  for (const row of existing) liveByKey.set(row.divisionKey, row);

  const missing = allKeys.filter((k) => !liveByKey.has(k));
  if (missing.length > 0) {
    for (const key of missing) {
      const def = poolByKey.get(key)!;
      const row = await db.division.upsert({
        where: { eventId_divisionKey: { eventId, divisionKey: key } },
        create: {
          eventId,
          eventDivisionId: def.id,
          name: def.name,
          gender: def.gender,
          eventType: def.eventType,
          divisionKey: key,
          minAge: def.minAge,
          maxAge: def.maxAge,
          weightClassId: def.weightClassId,
          beltType: def.beltType,
        },
        update: { eventDivisionId: def.id },
        select: { id: true, divisionKey: true },
      });
      liveByKey.set(key, row);
    }
  }

  await db.order.create({
    data: {
      eventId,
      coachId: chapter.id,
      chapterId: chapter.id,
      items: {
        create: postings.map((posting) => ({
          athleteId: posting.athleteId,
          divisions: {
            create: [...posting.divisionKeys].map((key) => ({
              divisionId: liveByKey.get(key)!.id,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidateTag(EVENT_REGISTRATIONS_TAG, "max");
  return { ok: true };
}