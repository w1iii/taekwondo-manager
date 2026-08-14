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

  const payment = await db.teamPayment.findFirst({
    where: { id, chapterId: chapter.id },
    include: { event: true },
  });
  if (!payment) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment proof</h1>
          <p className="text-sm text-muted-foreground">{payment.event.name}</p>
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
            {formatDate(payment.event.eventDate)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4" />
            {payment.event.location}
          </p>
        </CardContent>
      </Card>

      <ProofView
        proofUrl={payment.proofUrl}
        referenceNo={payment.referenceNo}
        amount={formatPesos(payment.amountPesos)}
        status={payment.status}
        submitted={formatDate(payment.submittedAt)}
        rejectionReason={payment.rejectionReason}
      />
    </div>
  );
}