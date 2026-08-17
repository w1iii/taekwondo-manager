"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logInfo, reportError } from "@/lib/log";
import { notify } from "@/lib/notifications";
import { EVENT_REGISTRATIONS_TAG } from "@/lib/enrollments";

export async function approvePayment(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payment = await db.paymentAttempt.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          event: true,
          items: { include: { athlete: true, divisions: true } },
        },
      },
    },
  });
  if (!payment) return;

  try {
    await db.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id },
        data: { outcome: "APPROVED", reviewedAt: new Date() },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "APPROVED" },
      });

      const orderItems = payment.order.items;
      for (const item of orderItems) {
        const approved = await tx.approvedAthlete.upsert({
          where: {
            eventId_athleteId: {
              eventId: payment.order.eventId,
              athleteId: item.athleteId,
            },
          },
          create: {
            eventId: payment.order.eventId,
            chapterId: payment.order.chapterId,
            athleteId: item.athleteId,
            orderId: payment.orderId,
          },
          update: {},
        });

        if (item.divisions.length > 0) {
          await tx.approvedAthleteDivision.createMany({
            data: item.divisions.map((d) => ({
              approvedAthleteId: approved.id,
              divisionId: d.divisionId,
            })),
            skipDuplicates: true,
          });
        }

        await tx.orderItem.delete({ where: { id: item.id } });
      }
    });
  } catch (error) {
    reportError("approve-payment-failed", { paymentId: id, actorId: user.userId }, error);
    throw error;
  }

  try {
    await notify(
      "COACH",
      payment.order.chapterId,
      "Payment approved",
      `${payment.order.event?.name ?? "Event"} — registration confirmed.`,
      "/dashboard/payments",
    );
  } catch (error) {
    reportError("notify-coach-failed", { paymentId: id }, error);
  }

  logInfo("payment-approved", {
    paymentId: id,
    orderId: payment.orderId,
    eventId: payment.order.eventId,
    actorId: user.userId,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
  revalidateTag(EVENT_REGISTRATIONS_TAG, "max");
}

export async function rejectPayment(formData: FormData): Promise<void> {
  const user = await requireRole("organizer");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const payment = await db.paymentAttempt.findUnique({
    where: { id },
    include: { order: { include: { event: true } } },
  });
  if (!payment) return;

  try {
    await db.paymentAttempt.update({
      where: { id },
      data: { outcome: "REJECTED", rejectionReason: reason, reviewedAt: new Date() },
    });

    await db.order.update({
      where: { id: payment.orderId },
      data: { status: "REJECTED" },
    });
  } catch (error) {
    reportError("reject-payment-failed", { paymentId: id, actorId: user.userId }, error);
    throw error;
  }

  try {
    await notify(
      "COACH",
      payment.order.chapterId,
      "Payment needs attention",
      reason
        ? `${payment.order.event?.name ?? "Event"} — ${reason}`
        : `${payment.order.event?.name ?? "Event"} — please resubmit your payment proof.`,
      "/dashboard/payments",
    );
  } catch (error) {
    reportError("notify-coach-failed", { paymentId: id }, error);
  }

  logInfo("payment-rejected", {
    paymentId: id,
    orderId: payment.orderId,
    eventId: payment.order.eventId,
    actorId: user.userId,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payments");
}
