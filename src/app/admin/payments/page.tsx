import Link from "next/link";
import { formatDate, formatPesos } from "@/lib/events";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentReviewActions } from "./payment-review";
import { Pagination } from "@/components/pagination";
import {
  PAGE_SIZE,
  pageCount,
  pageHref,
  clampPage,
  parsePage,
} from "@/lib/pagination";

export const metadata = { title: "Payments" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function PaymentCard({
  payment,
}: {
  payment: Awaited<ReturnType<typeof loadPayments>>[number];
}) {
  const order = payment.order;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {order?.chapter?.name ?? "Unknown chapter"}
            </span>
            <span className="text-muted-foreground">
              · {order?.event?.name ?? "Unknown event"}
            </span>
          </div>
          <p className="text-muted-foreground">
            {order?.items?.length ?? 0} athlete
            {(order?.items?.length ?? 0) === 1 ? "" : "s"} ·{" "}
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
          {payment.outcome === "PENDING" ? (
            <PaymentReviewActions id={payment.id} />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {STATUS_LABELS[payment.outcome] ?? payment.outcome}
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

async function loadPayments(outcome: string, page: number) {
  return db.paymentAttempt.findMany({
    where: { outcome: outcome as "PENDING" | "APPROVED" | "REJECTED" },
    orderBy: { submittedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      order: {
        include: {
          event: true,
          chapter: true,
          items: true,
        },
      },
    },
  });
}

export default async function PaymentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    pending?: string;
    approved?: string;
    rejected?: string;
  }>;
}) {
  await requireRole("organizer");

  const params = await searchParams;

  const [[pendingCount, approvedCount, rejectedCount], [pending, approved, rejected]] =
    await Promise.all([
      Promise.all([
        db.paymentAttempt.count({ where: { outcome: "PENDING" } }),
        db.paymentAttempt.count({ where: { outcome: "APPROVED" } }),
        db.paymentAttempt.count({ where: { outcome: "REJECTED" } }),
      ]),
      Promise.all([
        loadPayments("PENDING", parsePage(params.pending)),
        loadPayments("APPROVED", parsePage(params.approved)),
        loadPayments("REJECTED", parsePage(params.rejected)),
      ]),
    ]);

  const sections = [
    {
      key: "pending",
      title: "Pending review",
      count: pendingCount,
      rows: pending,
      page: parsePage(params.pending),
    },
    {
      key: "approved",
      title: "Approved",
      count: approvedCount,
      rows: approved,
      page: parsePage(params.approved),
    },
    {
      key: "rejected",
      title: "Rejected",
      count: rejectedCount,
      rows: rejected,
      page: parsePage(params.rejected),
    },
  ].map((s) => ({
    ...s,
    totalPages: pageCount(s.count),
    page: clampPage(s.page, pageCount(s.count)),
  }));

  const anyPayments = sections.some((s) => s.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Review chapter payments against the event fee before approving.
        </p>
      </div>

      {!anyPayments ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No payments submitted yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {sections.map((s) =>
            s.count === 0 ? null : (
              <Section key={s.key} title={s.title} count={s.count}>
                {s.rows.map((p) => (
                  <PaymentCard key={p.id} payment={p} />
                ))}
                <Pagination
                  page={s.page}
                  totalPages={s.totalPages}
                  buildHref={(page) => pageHref(params, s.key, page)}
                />
              </Section>
            ),
          )}
        </>
      )}
    </div>
  );
}
