"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { logInfo, reportError } from "@/lib/log";
import { parsePaymentFormData, type PaymentFormState } from "@/lib/payments";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { notify } from "@/lib/notifications";
import { formatPesos } from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";

export type CancelPaymentState = { ok: true } | { ok: false; error: string };

export async function submitPayment(formData: FormData): Promise<PaymentFormState> {
  const user = await requireRole("coach");

  const withinLimit = await checkRateLimit(`payment:${user.userId}`, 5, 60_000);
  if (!withinLimit) {
    return { ok: false, error: "Too many payment submissions. Try again in a minute." };
  }

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, error: "Missing order." };

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return { ok: false, error: "Link your chapter before submitting payment." };
  }

  const parsed = parsePaymentFormData(formData);
  if (!parsed.ok) return parsed;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { event: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.chapterId !== chapter.id) {
    return { ok: false, error: "Unauthorized." };
  }

  const event = order.event;
  if (event.status !== EventStatus.PUBLISHED) {
    return { ok: false, error: "That event is not accepting payments." };
  }

  const itemCount = await db.orderItem.count({
    where: { orderId },
  });
  if (itemCount === 0) {
    return { ok: false, error: "Register at least one athlete before paying." };
  }

  if (order.status === "PAID") {
    return { ok: false, error: "You already have a pending payment. Wait for review." };
  }

  if (order.status !== "PENDING") {
    return { ok: false, error: "This order cannot be paid." };
  }

  let proofUrl: string;
  try {
    proofUrl = await saveUpload(parsed.data.proof, "proofs", undefined, { private: true });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }

  const amountPesos = itemCount * event.entryFeePesos;

  try {
    await db.paymentAttempt.create({
      data: {
        orderId,
        referenceNo: parsed.data.referenceNo,
        proofUrl,
        amountPesos,
      },
    });

    await db.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });
  } catch (error) {
    await deleteUpload(proofUrl);
    reportError("submit-payment-failed", { orderId, actorId: user.userId }, error);
    throw error;
  }

  logInfo("payment-submitted", {
    orderId,
    eventId: order.eventId,
    chapterId: chapter.id,
    amountPesos,
    actorId: user.userId,
  });

  await notify(
    "ORGANIZER",
    null,
    "New payment submission",
    `${chapter.name} — ${event.name} (${formatPesos(amountPesos)}).`,
    "/admin/payments",
  );

  revalidatePath("/dashboard/payments");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { ok: true };
}

export async function cancelPayment(
  paymentId: string,
  reason: string,
): Promise<CancelPaymentState> {
  const user = await requireRole("coach");

  const withinLimit = await checkRateLimit(`cancel-payment:${user.userId}`, 5, 60_000);
  if (!withinLimit) {
    return { ok: false, error: "Too many requests. Try again in a minute." };
  }

  if (!reason.trim()) {
    return { ok: false, error: "Please provide a reason for cancellation." };
  }

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return { ok: false, error: "Chapter not found." };
  }

  const payment = await db.paymentAttempt.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) {
    return { ok: false, error: "Payment not found." };
  }

  if (payment.order.chapterId !== chapter.id) {
    return { ok: false, error: "Unauthorized." };
  }

  if (payment.outcome !== "PENDING") {
    return { ok: false, error: "Can only cancel pending payments." };
  }

  await db.paymentAttempt.update({
    where: { id: paymentId },
    data: { outcome: "REJECTED", rejectionReason: `Cancelled by coach: ${reason.trim()}`, reviewedAt: new Date() },
  });

  await db.order.update({
    where: { id: payment.orderId },
    data: { status: "REJECTED" },
  });

  logInfo("payment-cancelled", {
    paymentId,
    orderId: payment.orderId,
    chapterId: chapter.id,
    actorId: user.userId,
  });

  await notify(
    "ORGANIZER",
    null,
    "Payment cancelled",
    `${chapter.name} cancelled their payment. Reason: ${reason.trim()}`,
    "/admin/payments",
  );

  revalidatePath("/dashboard/payments");
  return { ok: true };
}
