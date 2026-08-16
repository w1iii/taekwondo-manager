import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate, formatPesos } from "@/lib/events";
import { ProofView } from "@/components/proof-view";

export const metadata = { title: "Payment proof" };

export default async function PaymentProofCoachPage({
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
    include: { order: { include: { event: true } } },
  });
  if (!payment) notFound();

  const event = payment.order.event;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment proof</h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
        </div>
        <Button render={<Link href="/dashboard/payments" />} variant="outline">
          <ArrowLeft />
          Back to payments
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            {formatDate(event.eventDate)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4" />
            {event.location}
          </p>
        </CardContent>
      </Card>

      <ProofView
        paymentId={payment.id}
        referenceNo={payment.referenceNo}
        amount={formatPesos(payment.amountPesos)}
        status={payment.outcome}
        submitted={formatDate(payment.submittedAt)}
        rejectionReason={payment.rejectionReason}
      />
    </div>
  );
}
