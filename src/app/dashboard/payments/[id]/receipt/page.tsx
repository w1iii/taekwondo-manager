import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate, formatDeadline, formatPesos } from "@/lib/events";
import { receiptNumber } from "@/lib/payments";
import { ProofView } from "@/components/proof-view";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Payment receipt" };

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("coach");

  const { id } = await params;
  const chapter = await getChapterForUser(user);
  if (!chapter) notFound();

  const payment = await db.paymentAttempt.findFirst({
    where: { id, order: { chapterId: chapter.id } },
    include: { order: { include: { event: true, items: true } } },
  });
  if (!payment || payment.outcome !== "APPROVED") notFound();

  const event = payment.order.event;
  if (!event) notFound();
  const enrolled = payment.order.items.length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment receipt</h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
        </div>
        <PrintButton />
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="size-5" />
              <span className="font-heading text-lg font-semibold">
                Official Receipt
              </span>
            </div>
            <div className="text-right text-sm">
              <p className="font-mono text-muted-foreground">
                {receiptNumber(payment.id)}
              </p>
              <p className="text-muted-foreground">
                {formatDate(payment.submittedAt)}
              </p>
            </div>
          </div>

          <Separator />

          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Chapter</dt>
              <dd className="font-medium">{chapter.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Event</dt>
              <dd className="text-right font-medium">{event.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Event date</dt>
              <dd className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatDate(event.eventDate)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">GCash reference</dt>
              <dd className="font-mono text-xs">{payment.referenceNo}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Athletes</dt>
              <dd>{enrolled}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Fee per athlete</dt>
              <dd>{formatPesos(event.entryFeePesos)}</dd>
            </div>
          </dl>

          <Separator />

          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total paid</span>
            <span>{formatPesos(payment.amountPesos)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge>Approved</Badge>
          </div>

          {payment.reviewedAt ? (
            <p className="text-xs text-muted-foreground">
              Approved {formatDate(payment.reviewedAt)} · Registration closes{" "}
              {formatDeadline(event.registrationDeadline)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3 print:hidden">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Proof of payment
        </h2>
        <ProofView
          paymentId={payment.id}
          referenceNo={payment.referenceNo}
          amount={formatPesos(payment.amountPesos)}
          status={payment.outcome}
          submitted={formatDate(payment.submittedAt)}
        />
      </section>
    </div>
  );
}
