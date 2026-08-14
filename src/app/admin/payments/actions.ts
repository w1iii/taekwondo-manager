"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentStatus } from "@/generated/prisma/client";

export async function approvePayment(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.teamPayment.update({
    where: { id },
    data: { status: PaymentStatus.APPROVED, reviewedAt: new Date() },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}

export async function rejectPayment(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  await db.teamPayment.update({
    where: { id },
    data: { status: PaymentStatus.REJECTED, rejectionReason: reason, reviewedAt: new Date() },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}
