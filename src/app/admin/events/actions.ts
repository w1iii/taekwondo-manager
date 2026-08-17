"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { findDivisionDefinition } from "@/lib/divisions";
import { reportError } from "@/lib/log";
import { parseEventFormData, type EventFormState } from "@/lib/events";
import { deleteUpload, saveUpload, UploadError } from "@/lib/uploads";
import {
  BeltType,
  EventStatus,
  Gender,
  EventType,
  type Prisma,
} from "@/generated/prisma/client";

type DivisionPayload = {
  name: string;
  gender: Gender;
  eventType: EventType;
  divisionKey: string;
  minAge: number | null;
  maxAge: number | null;
  weightClassId: string | null;
  beltType: BeltType | null;
  sortOrder: number;
};

async function resolveDivisionPayloads(formData: FormData): Promise<DivisionPayload[]> {
  const keys = formData
    .getAll("divisionKey")
    .map((v) => String(v))
    .filter((k) => k.length > 0);
  if (keys.length === 0) return [];

  const weightClasses = await db.weightClass.findMany({
    orderBy: [{ gender: "asc" }, { sortOrder: "asc" }],
  });

  const payloads: DivisionPayload[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const def = findDivisionDefinition(weightClasses, key);
    if (!def) continue;
    payloads.push({ ...def, sortOrder: payloads.length });
  }
  return payloads;
}

async function parseImage(formData: FormData): Promise<string | null | { error: string }> {
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return null;

  try {
    return await saveUpload(image, "events");
  } catch (error) {
    return {
      error: error instanceof UploadError ? error.message : "Image exceeds 15MB. choose another image.",
    };
  }
}

export async function createEvent(formData: FormData): Promise<EventFormState> {
  await requireRole("organizer");

  const parsed = parseEventFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const imageResult = await parseImage(formData);
  if (imageResult && typeof imageResult !== "string") {
    return { ok: false, error: imageResult.error };
  }

  const divisions = await resolveDivisionPayloads(formData);

  try {
    await db.event.create({
      data: {
        ...parsed.data,
        imageUrl: typeof imageResult === "string" ? imageResult : null,
        eventDivisions: { create: divisions },
      },
    });
  } catch (error) {
    reportError("create-event-failed", { actorId: (await requireRole("organizer")).userId }, error);
    return { ok: false, error: "Failed to create event. Please try again." };
  }

  revalidateTag("events-published", "max");
  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/dashboard/events");
  redirect("/admin/events");
}

export async function updateEvent(formData: FormData): Promise<EventFormState> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing event id." };

  const parsed = parseEventFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const imageResult = await parseImage(formData);
  if (imageResult && typeof imageResult !== "string") {
    return { ok: false, error: imageResult.error };
  }

  const data: Prisma.EventUpdateInput = {
    name: parsed.data.name,
    description: parsed.data.description,
    location: parsed.data.location,
    eventDate: parsed.data.eventDate,
    registrationDeadline: parsed.data.registrationDeadline,
    entryFeePesos: parsed.data.entryFeePesos,
  };

  // No new file picked → keep the existing image. Only replace when a new one is uploaded.
  if (typeof imageResult === "string") {
    const existing = await db.event.findUnique({ where: { id }, select: { imageUrl: true } });
    if (existing?.imageUrl) await deleteUpload(existing.imageUrl);
    data.imageUrl = imageResult;
  }

  const divisions = await resolveDivisionPayloads(formData);

  try {
    await db.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data });
      await tx.eventDivision.deleteMany({ where: { eventId: id } });
      if (divisions.length > 0) {
        await tx.eventDivision.createMany({
          data: divisions.map((d) => ({ ...d, eventId: id })),
        });
      }
    });
  } catch (error) {
    reportError("update-event-failed", { eventId: id, actorId: (await requireRole("organizer")).userId }, error);
    return { ok: false, error: "Failed to update event. Please try again." };
  }

  revalidateTag("events-published", "max");
  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/dashboard/events");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const event = await db.event.findUnique({ where: { id }, select: { imageUrl: true } });
    await db.event.delete({ where: { id } });
    if (event?.imageUrl) await deleteUpload(event.imageUrl);
  } catch (error) {
    reportError("delete-event-failed", { eventId: id }, error);
    return;
  }

  revalidateTag("events-published", "max");
  revalidateTag("brackets-cells", "max");
  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/admin/brackets");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/brackets");
  revalidatePath("/dashboard/payments");
}

export async function setEventStatus(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  if (!id) return;

  if (rawStatus !== EventStatus.DRAFT && rawStatus !== EventStatus.PUBLISHED) {
    return;
  }

  try {
    const event = await db.event.update({
      where: { id },
      data: { status: rawStatus },
    });

    if (rawStatus === EventStatus.PUBLISHED) {
      // Fan out one row per approved chapter with a single INSERT...SELECT —
      // no in-memory chapter list, and it stays O(1) client-side work even at
      // thousands of coaches.
      await db.$executeRaw`
        INSERT INTO "Notification" ("id", "role", "targetChapterId", "title", "body", "link", "createdAt")
        SELECT gen_random_uuid(), 'COACH', "id", 'Registration open', ${`${event.name} is accepting registrations.`}, '/dashboard/events', now()
        FROM "Chapter" WHERE "status" = 'APPROVED'
      `;
    }
  } catch (error) {
    reportError("set-event-status-failed", { eventId: id, status: rawStatus }, error);
    return;
  }

  revalidateTag("events-published", "max");
  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/dashboard/events");
}
