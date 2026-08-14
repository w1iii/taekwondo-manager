"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseEventFormData, type EventFormState } from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";

export async function createEvent(formData: FormData): Promise<EventFormState> {
  await requireRole("organizer");

  const parsed = parseEventFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  await db.event.create({ data: parsed.data });

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

  await db.event.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.event.delete({ where: { id } });

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

  await db.event.update({
    where: { id },
    data: { status: rawStatus },
  });

  revalidatePath("/admin/events");
  revalidatePath("/admin");
}
