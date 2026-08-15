"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseEventFormData, type EventFormState } from "@/lib/events";
import { deleteUpload, saveUpload, UploadError } from "@/lib/uploads";
import { EventStatus, type Prisma } from "@/generated/prisma/client";

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

  await db.event.create({
    data: { ...parsed.data, imageUrl: typeof imageResult === "string" ? imageResult : null },
  });

  revalidateTag("events-published", "max");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
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

  await db.event.update({ where: { id }, data });

  revalidateTag("events-published", "max");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const event = await db.event.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.event.delete({ where: { id } });
  if (event?.imageUrl) await deleteUpload(event.imageUrl);

  revalidateTag("events-published", "max");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
}

export async function setEventStatus(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  if (!id) return;

  if (rawStatus !== EventStatus.DRAFT && rawStatus !== EventStatus.PUBLISHED) {
    return;
  }

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

  revalidateTag("events-published", "max");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
}
