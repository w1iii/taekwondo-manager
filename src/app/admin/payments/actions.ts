"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logInfo, reportError } from "@/lib/log";
import { notify } from "@/lib/notifications";
import { PaymentStatus } from "@/generated/prisma/client";

export async function approvePayment(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payment = await db.teamPayment.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!payment) return;

  try {
    await db.teamPayment.update({
      where: { id },
      data: { status: PaymentStatus.APPROVED, reviewedAt: new Date() },
    });
  } catch (error) {
    reportError("approve-payment-failed", { paymentId: id, actorId: user.userId }, error);
    throw error;
  }

  try {
    await notify(
      "COACH",
      payment.chapterId,
      "Payment approved",
      `${payment.event.name} — registration confirmed.`,
      "/dashboard/payments",
    );
  } catch (error) {
    reportError("notify-coach-failed", { paymentId: id }, error);
  }

  logInfo("payment-approved", {
    paymentId: id,
    chapterId: payment.chapterId,
    eventId: payment.eventId,
    actorId: user.userId,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}

export async function rejectPayment(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const payment = await db.teamPayment.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!payment) return;

  try {
    await db.teamPayment.update({
      where: { id },
      data: { status: PaymentStatus.REJECTED, rejectionReason: reason, reviewedAt: new Date() },
    });
  } catch (error) {
    reportError("reject-payment-failed", { paymentId: id, actorId: user.userId }, error);
    throw error;
  }

  try {
    await notify(
      "COACH",
      payment.chapterId,
      "Payment needs attention",
      reason
        ? `${payment.event.name} — ${reason}`
        : `${payment.event.name} — please resubmit your payment proof.`,
      "/dashboard/payments",
    );
  } catch (error) {
    reportError("notify-coach-failed", { paymentId: id }, error);
  }

  logInfo("payment-rejected", {
    paymentId: id,
    chapterId: payment.chapterId,
    eventId: payment.eventId,
    actorId: user.userId,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}
