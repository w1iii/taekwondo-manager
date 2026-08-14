"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { PaymentStatus } from "@/generated/prisma/client";

export async function approvePayment(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payment = await db.teamPayment.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!payment) return;

  await db.teamPayment.update({
    where: { id },
    data: { status: PaymentStatus.APPROVED, reviewedAt: new Date() },
  });

  await notify(
    "COACH",
    payment.chapterId,
    "Payment approved",
    `${payment.event.name} — registration confirmed.`,
    "/dashboard/payments",
  );

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}

export async function rejectPayment(formData: FormData): Promise<void> {
  await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const payment = await db.teamPayment.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!payment) return;

  await db.teamPayment.update({
    where: { id },
    data: { status: PaymentStatus.REJECTED, rejectionReason: reason, reviewedAt: new Date() },
  });

  await notify(
    "COACH",
    payment.chapterId,
    "Payment needs attention",
    reason
      ? `${payment.event.name} — ${reason}`
      : `${payment.event.name} — please resubmit your payment proof.`,
    "/dashboard/payments",
  );

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}
