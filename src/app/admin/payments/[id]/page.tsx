import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatPesos } from "@/lib/events";
import { ProofView } from "@/components/proof-view";

export const metadata = { title: "Payment proof" };

export default async function PaymentProofAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("organizer");

  const { id } = await params;
  const payment = await db.paymentAttempt.findUnique({
    where: { id },
    include: {
      order: {
        include: { event: true, chapter: true },
      },
    },
  });
  if (!payment) notFound();

  const { event, chapter } = payment.order;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment proof</h1>
          <p className="text-sm text-muted-foreground">
            {chapter.name} · {event.name}
          </p>
        </div>
        <Button render={<Link href="/admin/payments" />} variant="outline">
          <ArrowLeft />
          Back to payments
        </Button>
      </div>

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
