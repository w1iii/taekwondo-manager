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
import { EventStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";

export type CancelPaymentState = { ok: true } | { ok: false; error: string };

async function paymentDeps(eventId: string, chapterId: string) {
  const event = await db.event.findFirst({
    where: { id: eventId, status: EventStatus.PUBLISHED },
  });
  const enrolled = await db.enrollment.count({
    where: { eventId, chapterId },
  });
  return { event, enrolled };
}

export async function submitPayment(formData: FormData): Promise<PaymentFormState> {
  const user = await requireRole("coach");

  const withinLimit = await checkRateLimit(`payment:${user.userId}`, 5, 60_000);
  if (!withinLimit) {
    return { ok: false, error: "Too many payment submissions. Try again in a minute." };
  }

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { ok: false, error: "Missing event." };

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return { ok: false, error: "Link your chapter before submitting payment." };
  }

  const parsed = parsePaymentFormData(formData);
  if (!parsed.ok) return parsed;

  const { event, enrolled } = await paymentDeps(eventId, chapter.id);
  if (!event) return { ok: false, error: "That event is not accepting payments." };
  if (enrolled === 0) {
    return { ok: false, error: "Register at least one athlete before paying." };
  }

  const existing = await db.teamPayment.findUnique({
    where: { eventId_chapterId: { eventId, chapterId: chapter.id } },
  });
  if (existing && existing.status !== PaymentStatus.REJECTED) {
    return {
      ok: false,
      error:
        existing.status === PaymentStatus.APPROVED
          ? "Your payment for this event is already approved."
          : "You already submitted a payment for this event. Awaiting review.",
    };
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

  const amountPesos = enrolled * event.entryFeePesos;

  if (existing) {
    await db.teamPayment.update({
      where: { id: existing.id },
      data: {
        referenceNo: parsed.data.referenceNo,
        proofUrl,
        amountPesos,
        status: PaymentStatus.PENDING,
        rejectionReason: null,
        submittedAt: new Date(),
      },
    });
  } else {
    try {
      await db.teamPayment.create({
        data: {
          eventId,
          chapterId: chapter.id,
          referenceNo: parsed.data.referenceNo,
          proofUrl,
          amountPesos,
        },
      });
    } catch (error) {
      // Another request created the same (eventId, chapterId) row between our
      // earlier existence check and this create (TOCTOU race on the unique
      // constraint). Surface a friendly error instead of a 500, and remove the
      // just-uploaded proof so no orphaned private file is left in storage.
      await deleteUpload(proofUrl);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        logInfo("payment-duplicate-blocked", { eventId, actorId: user.userId });
        return {
          ok: false,
          error: "Your payment for this event was just submitted. Refresh to see its status.",
        };
      }
      reportError("submit-payment-failed", { eventId, actorId: user.userId }, error);
      throw error;
    }
  }

  logInfo("payment-submitted", {
    eventId,
    chapterId: chapter.id,
    amountPesos,
    actorId: user.userId,
    resubmitted: Boolean(existing),
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

  const payment = await db.teamPayment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return { ok: false, error: "Payment not found." };
  }

  if (payment.chapterId !== chapter.id) {
    return { ok: false, error: "Unauthorized." };
  }

  if (payment.status === PaymentStatus.CANCELLED) {
    return { ok: false, error: "Payment is already cancelled." };
  }

  if (payment.status === PaymentStatus.APPROVED) {
    return { ok: false, error: "Cannot cancel an approved payment." };
  }

  await db.teamPayment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.CANCELLED,
      rejectionReason: reason.trim(),
      reviewedAt: new Date(),
    },
  });

  logInfo("payment-cancelled", {
    paymentId,
    eventId: payment.eventId,
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
