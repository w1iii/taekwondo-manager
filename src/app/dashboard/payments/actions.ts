"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { parsePaymentFormData, type PaymentFormState } from "@/lib/payments";
import { saveUpload } from "@/lib/uploads";
import { notify } from "@/lib/notifications";
import { formatPesos } from "@/lib/events";
import { EventStatus, PaymentStatus } from "@/generated/prisma/client";

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
    proofUrl = await saveUpload(parsed.data.proof, "proofs");
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
    await db.teamPayment.create({
      data: {
        eventId,
        chapterId: chapter.id,
        referenceNo: parsed.data.referenceNo,
        proofUrl,
        amountPesos,
      },
    });
  }

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
