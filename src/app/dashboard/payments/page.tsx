import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate, formatPesos } from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";
import { submitPayment, cancelPayment } from "./actions";
import { PaymentForm } from "./payment-form";
import { CancelPaymentButton } from "./cancel-payment-button";

export const metadata = { title: "Team Payment" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function statusVariant(status: string) {
  if (status === "APPROVED") return "default";
  if (status === "PAID") return "secondary";
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

  const orders = await db.order.findMany({
    where: { chapterId: chapter.id },
    include: {
      event: true,
      items: { include: { athlete: true } },
      payments: { orderBy: { submittedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = orders.filter((o) => o.event.status === EventStatus.PUBLISHED);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Payment</h1>
        <p className="text-sm text-muted-foreground">
          Pay the entry fee for your registered athletes per event.
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No events to pay for yet. Register athletes for an event first.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => {
            const event = order.event;
            const itemCount = order.items.length;
            const amount = itemCount * event.entryFeePesos;
            const latestAttempt = order.payments[0];

            return (
              <li key={order.id} className="rounded-lg border bg-card p-4">
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
                        {itemCount} athlete{itemCount === 1 ? "" : "s"} ×{" "}
                        {formatPesos(event.entryFeePesos)} ={" "}
                        <span className="font-semibold text-foreground">
                          {formatPesos(amount)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Badge variant={statusVariant(order.status)}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </div>

                {itemCount > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Registered athletes:
                    </p>
                    <ul className="text-sm">
                      {order.items.map((item) => (
                        <li key={item.id}>{item.athlete.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latestAttempt && (
                  <div className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                    <p>
                      Reference:{" "}
                      <span className="font-medium">{latestAttempt.referenceNo}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-2">
                      Proof:
                      <Button
                        render={<Link href={`/dashboard/payments/${latestAttempt.id}`} />}
                        variant="outline"
                        size="sm"
                      >
                        View screenshot
                      </Button>
                      {latestAttempt.outcome === "APPROVED" ? (
                        <Button
                          render={
                            <Link href={`/dashboard/payments/${latestAttempt.id}/receipt`} />
                          }
                          variant="outline"
                          size="sm"
                        >
                          Receipt
                        </Button>
                      ) : null}
                      {latestAttempt.outcome === "PENDING" ? (
                        <CancelPaymentButton
                          paymentId={latestAttempt.id}
                          action={cancelPayment}
                        />
                      ) : null}
                    </p>
                    {latestAttempt.outcome === "REJECTED" ? (
                      <p role="alert" className="text-destructive">
                        {latestAttempt.rejectionReason
                          ? `Reason: ${latestAttempt.rejectionReason}`
                          : "Rejected. Update your details and resubmit."}
                      </p>
                    ) : null}
                    {latestAttempt.outcome === "APPROVED" ? (
                      <p className="text-emerald-600">
                        Your registration for this event is confirmed.
                      </p>
                    ) : null}
                  </div>
                )}

                {order.status === "PENDING" && (
                  <div className="mt-4">
                    <PaymentForm
                      orderId={order.id}
                      action={submitPayment}
                      defaultReference={latestAttempt?.referenceNo}
                    />
                  </div>
                )}

                {order.status === "REJECTED" && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Order was rejected. Create a new order with athletes to try again.
                    </p>
                    <Button render={<Link href={`/dashboard/events/${event.id}`} />} variant="outline" size="sm">
                      Create new order
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
