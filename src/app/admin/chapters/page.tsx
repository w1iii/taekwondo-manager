import { Building2, MapPin, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CHAPTER_STATUS_LABELS } from "@/lib/chapters";
import { ChapterStatus, type Chapter } from "@/generated/prisma/client";
import { ChapterActions } from "./chapter-actions";

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

export default async function ChaptersPage() {
  await requireRole("organizer");

  const chapters = await db.chapter.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pending = chapters.filter((c) => c.status === ChapterStatus.PENDING);
  const approved = chapters.filter((c) => c.status === ChapterStatus.APPROVED);
  const rejected = chapters.filter((c) => c.status === ChapterStatus.REJECTED);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chapters</h1>
        <p className="text-sm text-muted-foreground">
          Review registration requests and approve chapters so their head coach
          can access the coach dashboard.
        </p>
      </div>

      {chapters.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No chapter registrations yet. Share the registration link with your
            chapters.
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 ? (
            <Section title="Pending approval" count={pending.length}>
              {pending.map((c) => (
                <ChapterCard key={c.id} chapter={c} />
              ))}
            </Section>
          ) : null}

          {approved.length > 0 ? (
            <Section title="Approved" count={approved.length}>
              {approved.map((c) => (
                <ChapterCard key={c.id} chapter={c} />
              ))}
            </Section>
          ) : null}

          {rejected.length > 0 ? (
            <Section title="Rejected" count={rejected.length}>
              {rejected.map((c) => (
                <ChapterCard key={c.id} chapter={c} />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
