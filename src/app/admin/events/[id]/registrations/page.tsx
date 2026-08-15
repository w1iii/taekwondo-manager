import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { ChapterCard } from "./chapter-card";

export const metadata = { title: "Event registrations" };

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("organizer");

  const { id } = await params;
  const event = await db.event.findFirst({ where: { id } });
  if (!event) notFound();

  const enrollments = await db.enrollment.findMany({
    where: { eventId: id },
    include: { athlete: true, chapter: true },
    orderBy: [{ chapter: { name: "asc" } }, { athlete: { name: "asc" } }],
  });

  const chapterIds = [...new Set(enrollments.map((e) => e.chapterId))];
  const payments = await db.teamPayment.findMany({
    where: { eventId: id, chapterId: { in: chapterIds } },
  });
  const paymentByChapter = new Map(payments.map((p) => [p.chapterId, p]));

  const byChapter = new Map<string, (typeof enrollments)[number][]>();
  for (const enrollment of enrollments) {
    const list = byChapter.get(enrollment.chapterId) ?? [];
    list.push(enrollment);
    byChapter.set(enrollment.chapterId, list);
  }
  const chapters = [...byChapter.entries()].map(([chapterId, rows]) => ({
    chapter: rows[0].chapter,
    rows,
    payment: paymentByChapter.get(chapterId) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.eventDate)} · {event.location} ·{" "}
            {enrollments.length} athlete{enrollments.length === 1 ? "" : "s"} across{" "}
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/admin/events" />} variant="outline">
          <ArrowLeft />
          Back to events
        </Button>
      </div>

      {chapters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            No registrations for this event yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {chapters.map(({ chapter, rows, payment }) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              rows={rows}
              payment={payment}
              entryFeePesos={event.entryFeePesos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
