import Link from "next/link";
import { formatDate, formatPesos } from "@/lib/events";
import { PaymentStatus } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentReviewActions } from "./payment-review";

export const metadata = { title: "Payments" };

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function PaymentCard({
  payment,
}: {
  payment: Awaited<ReturnType<typeof loadPayments>>[number];
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{payment.chapter.name}</span>
            <span className="text-muted-foreground">· {payment.event.name}</span>
          </div>
          <p className="text-muted-foreground">
            {formatPesos(payment.amountPesos)} · Reference: {payment.referenceNo}
          </p>
          <p className="text-muted-foreground">
            Submitted {formatDate(payment.submittedAt)}
          </p>
          <p className="flex flex-wrap items-center gap-2">
            Proof:
            <Button
              render={<Link href={`/admin/payments/${payment.id}`} />}
              variant="outline"
              size="sm"
            >
              View screenshot
            </Button>
          </p>
          {payment.rejectionReason ? (
            <p className="text-destructive">Reason: {payment.rejectionReason}</p>
          ) : null}
        </div>

        <div className="sm:shrink-0">
          {payment.status === PaymentStatus.PENDING ? (
            <PaymentReviewActions id={payment.id} />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {STATUS_LABELS[payment.status]}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {count}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

async function loadPayments() {
  return db.teamPayment.findMany({
    orderBy: { submittedAt: "desc" },
    include: { event: true, chapter: true },
  });
}

export default async function PaymentsAdminPage() {
  await requireRole("organizer");

  const payments = await loadPayments();

  const pending = payments.filter((p) => p.status === PaymentStatus.PENDING);
  const approved = payments.filter((p) => p.status === PaymentStatus.APPROVED);
  const rejected = payments.filter((p) => p.status === PaymentStatus.REJECTED);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Review chapter payments against the event fee before approving.
        </p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No payments submitted yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <Section title="Pending review" count={pending.length}>
            {pending.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </Section>
          <Section title="Approved" count={approved.length}>
            {approved.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </Section>
          <Section title="Rejected" count={rejected.length}>
            {rejected.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}