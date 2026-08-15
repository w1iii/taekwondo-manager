import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate, formatPesos } from "@/lib/events";
import { EventStatus, PaymentStatus } from "@/generated/prisma/client";
import { submitPayment, cancelPayment } from "./actions";
import { PaymentForm } from "./payment-form";
import { CancelPaymentButton } from "./cancel-payment-button";

export const metadata = { title: "Team Payment" };

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected — resubmit",
  CANCELLED: "Cancelled",
};

function statusVariant(status: PaymentStatus) {
  if (status === PaymentStatus.APPROVED) return "default";
  if (status === PaymentStatus.PENDING) return "secondary";
  if (status === PaymentStatus.CANCELLED) return "outline";
  return "destructive";
}

export default async function PaymentsPage() {
  const user = await requireRole("coach");

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Team Payment</h1>
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Link your chapter before submitting payments.
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = await db.enrollment.groupBy({
    by: ["eventId"],
    where: { chapterId: chapter.id },
    _count: { _all: true },
  });
  const enrolledByEvent = new Map(grouped.map((g) => [g.eventId, g._count._all]));

  const events = await db.event.findMany({
    where: { id: { in: [...enrolledByEvent.keys()] }, status: EventStatus.PUBLISHED },
    orderBy: { eventDate: "asc" },
  });

  const payments = await db.teamPayment.findMany({
    where: { chapterId: chapter.id },
  });
  const paymentByEvent = new Map(payments.map((p) => [p.eventId, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Payment</h1>
        <p className="text-sm text-muted-foreground">
          Pay the entry fee for your registered athletes per event.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No events to pay for yet. Register athletes for an event first.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const enrolled = enrolledByEvent.get(event.id) ?? 0;
            const amount = enrolled * event.entryFeePesos;
            const payment = paymentByEvent.get(event.id);

            return (
              <li key={event.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        {formatDate(event.eventDate)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="size-4" />
                        {event.location}
                      </p>
                      <p>
                        {enrolled} athlete{enrolled === 1 ? "" : "s"} ×{" "}
                        {formatPesos(event.entryFeePesos)} ={" "}
                        <span className="font-semibold text-foreground">
                          {formatPesos(amount)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {payment ? (
                    <Badge variant={statusVariant(payment.status)}>
                      {STATUS_LABELS[payment.status]}
                    </Badge>
                  ) : null}
                </div>

                {payment ? (
                  <div className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                    <p>
                      Reference:{" "}
                      <span className="font-medium">{payment.referenceNo}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-2">
                      Proof:
                      <Button
                        render={<Link href={`/dashboard/payments/${payment.id}`} />}
                        variant="outline"
                        size="sm"
                      >
                        View screenshot
                      </Button>
                      {payment.status === PaymentStatus.APPROVED ? (
                        <Button
                          render={
                            <Link href={`/dashboard/payments/${payment.id}/receipt`} />
                          }
                          variant="outline"
                          size="sm"
                        >
                          Receipt
                        </Button>
                      ) : null}
                      {payment.status === PaymentStatus.PENDING ? (
                        <CancelPaymentButton
                          paymentId={payment.id}
                          action={cancelPayment}
                        />
                      ) : null}
                    </p>
                    {payment.status === PaymentStatus.REJECTED ? (
                      <p role="alert" className="text-destructive">
                        {payment.rejectionReason
                          ? `Reason: ${payment.rejectionReason}`
                          : "Rejected. Update your details and resubmit."}
                      </p>
                    ) : null}
                    {payment.status === PaymentStatus.CANCELLED ? (
                      <p role="alert" className="text-muted-foreground">
                        {payment.rejectionReason
                          ? `Cancelled: ${payment.rejectionReason}`
                          : "Cancelled."}
                      </p>
                    ) : null}
                    {payment.status === PaymentStatus.APPROVED ? (
                      <p className="text-emerald-600">
                        Your registration for this event is confirmed.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!payment || payment.status === PaymentStatus.REJECTED ? (
                  <div className="mt-4">
                    <PaymentForm
                      eventId={event.id}
                      action={submitPayment}
                      defaultReference={payment?.referenceNo}
                      resubmitting={payment?.status === PaymentStatus.REJECTED}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}