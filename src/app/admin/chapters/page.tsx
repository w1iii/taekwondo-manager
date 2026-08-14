import { Building2, MapPin, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CHAPTER_STATUS_LABELS } from "@/lib/chapters";
import { ChapterStatus, type Chapter } from "@/generated/prisma/client";
import { ChapterActions } from "./chapter-actions";
import { Pagination } from "@/components/pagination";
import {
  PAGE_SIZE,
  pageCount,
  pageHref,
  clampPage,
  parsePage,
} from "@/lib/pagination";

export const metadata = { title: "Chapters" };

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function statusBadge(status: ChapterStatus) {
  const variant =
    status === ChapterStatus.APPROVED
      ? "default"
      : status === ChapterStatus.REJECTED
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{CHAPTER_STATUS_LABELS[status]}</Badge>;
}

function ChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {chapter.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chapter.logoUrl}
            alt={`${chapter.name} logo`}
            className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{chapter.name}</h2>
            {statusBadge(chapter.status)}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {chapter.city}, {chapter.province}
            </span>
            <span className="inline-flex items-center gap-1">
              <Smartphone className="size-3.5" />
              {chapter.gcashNumber}
            </span>
          </div>

          <p className="mt-1 text-sm">
            Head coach:{" "}
            <span className="font-medium text-foreground">
              {chapter.headCoachName} ({chapter.headCoachEmail})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Submitted {dateFmt.format(chapter.createdAt)}
          </p>

          {chapter.status === ChapterStatus.APPROVED ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Coach signs up with {chapter.headCoachEmail} to claim this chapter.
            </p>
          ) : chapter.status === ChapterStatus.REJECTED && chapter.rejectionReason ? (
            <p className="mt-2 text-xs text-destructive">
              Rejection reason: {chapter.rejectionReason}
            </p>
          ) : null}
        </div>

        {chapter.status === ChapterStatus.PENDING ? (
          <div className="sm:shrink-0">
            <ChapterActions id={chapter.id} />
          </div>
        ) : null}
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
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {count}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

async function loadChapters(status: ChapterStatus, page: number) {
  return db.chapter.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
}

export default async function ChaptersPage({
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
        db.chapter.count({ where: { status: ChapterStatus.PENDING } }),
        db.chapter.count({ where: { status: ChapterStatus.APPROVED } }),
        db.chapter.count({ where: { status: ChapterStatus.REJECTED } }),
      ]),
      Promise.all([
        loadChapters(ChapterStatus.PENDING, parsePage(params.pending)),
        loadChapters(ChapterStatus.APPROVED, parsePage(params.approved)),
        loadChapters(ChapterStatus.REJECTED, parsePage(params.rejected)),
      ]),
    ]);

  const sections = [
    {
      key: "pending",
      title: "Pending approval",
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

  const anyChapters = sections.some((s) => s.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chapters</h1>
        <p className="text-sm text-muted-foreground">
          Review registration requests and approve chapters so their head coach
          can access the coach dashboard.
        </p>
      </div>

      {!anyChapters ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No chapter registrations yet. Share the registration link with your
            chapters.
          </CardContent>
        </Card>
      ) : (
        <>
          {sections.map((s) =>
            s.count === 0 ? null : (
              <Section
                key={s.key}
                title={s.title}
                count={s.count}
              >
                {s.rows.map((c) => (
                  <ChapterCard key={c.id} chapter={c} />
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
