"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseEventFormData, type EventFormState } from "@/lib/events";
import { deleteUpload, saveUpload, UploadError } from "@/lib/uploads";
import { EventStatus } from "@/generated/prisma/client";

async function parseImage(formData: FormData): Promise<string | null | { error: string }> {
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return null;

  try {
    return await saveUpload(image, "events");
  } catch (error) {
    return {
      error: error instanceof UploadError ? error.message : "Image upload failed.",
    };
  }
}

export async function createEvent(formData: FormData): Promise<EventFormState> {
  await requireRole("organizer");

  const parsed = parseEventFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const imageUrl = await parseImage(formData);
  if (typeof imageUrl !== "string") {
    return { ok: false, error: imageUrl?.error ?? "Image upload failed." };
  }

  await db.event.create({ data: { ...parsed.data, imageUrl } });

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

  const imageUrl = await parseImage(formData);
  if (typeof imageUrl !== "string") {
    return { ok: false, error: imageUrl?.error ?? "Image upload failed." };
  }

  if (imageUrl) {
    const existing = await db.event.findUnique({ where: { id }, select: { imageUrl: true } });
    if (existing?.imageUrl) await deleteUpload(existing.imageUrl);
  }

  await db.event.update({ where: { id }, data: { ...parsed.data, imageUrl } });

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
    const chapters = await db.chapter.findMany({
      where: { status: "APPROVED" },
      select: { id: true },
    });
    await db.notification.createMany({
      data: chapters.map((c) => ({
        role: "COACH",
        targetChapterId: c.id,
        title: "Registration open",
        body: `${event.name} is accepting registrations.`,
        link: "/dashboard/events",
      })),
    });
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin");
}
