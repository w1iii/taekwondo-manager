import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { claimChapterForUser, getChapterForUser, CHAPTER_STATUS_LABELS } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate, formatPesos } from "@/lib/events";
import { proofStatusLabel } from "@/lib/payments";
import { ChapterStatus, EventStatus, PaymentStatus } from "@/generated/prisma/client";

export const metadata = { title: "Coach Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireRole("coach");
  await claimChapterForUser(user);
  const chapter = await getChapterForUser(user);

  const [athleteCount, nextEvent, nextPayment] = await Promise.all([
    chapter ? db.athlete.count({ where: { chapterId: chapter.id } }) : Promise.resolve(0),
    db.event.findFirst({
      where: { status: EventStatus.PUBLISHED, eventDate: { gte: new Date() } },
      orderBy: { eventDate: "asc" },
    }),
    chapter
      ? db.teamPayment.findFirst({
          where: { chapterId: chapter.id, status: { not: PaymentStatus.REJECTED } },
          orderBy: { submittedAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const paymentCard =
    nextEvent && chapter ? (
      <Card>
        <CardHeader>
          <CardDescription>Payment status</CardDescription>
          <CardTitle className="text-lg">
            {nextPayment ? (
              <Badge
                variant={
                  nextPayment.status === PaymentStatus.APPROVED ? "default" : "secondary"
                }
              >
                {proofStatusLabel(nextPayment.status)}
              </Badge>
            ) : (
              "Not submitted"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {nextPayment ? (
            <p>
              {nextPayment.status === PaymentStatus.APPROVED
                ? "Your team payment for the next event is in."
                : "Your team payment for the next event is under review."}
            </p>
          ) : (
            <p>
              Submit your team payment of {formatPesos(nextEvent.entryFeePesos)} per athlete for
              the next event.
            </p>
          )}
        </CardContent>
      </Card>
    ) : (
      <Card>
        <CardHeader>
          <CardDescription>Payment status</CardDescription>
          <CardTitle className="text-lg">—</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {chapter ? "No upcoming events yet." : "Link your chapter to submit payments."}
        </CardContent>
      </Card>
    );

  const nextTournamentCard = nextEvent ? (
    <Card>
      <CardHeader>
        <CardDescription>Next tournament</CardDescription>
        <CardTitle className="text-lg">{nextEvent.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{formatDate(nextEvent.eventDate)}</p>
        <p>{nextEvent.location}</p>
        <div className="mt-3">
          <Button size="sm" variant="outline" render={<Link href={`/dashboard/events/${nextEvent.id}`} />}>
            View event
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardDescription>Next tournament</CardDescription>
        <CardTitle className="text-lg">—</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Driven by the event calendar.
      </CardContent>
    </Card>
  );

  const chapterCard = chapter ? (
    <Card>
      <CardHeader>
        <CardDescription>Chapter</CardDescription>
        <CardTitle className="text-lg">{chapter.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant={chapter.status === ChapterStatus.APPROVED ? "default" : "secondary"}>
            {CHAPTER_STATUS_LABELS[chapter.status]}
          </Badge>
        </div>
        <p>
          {chapter.city}, {chapter.province}
        </p>
        <p>Head coach: {chapter.headCoachName}</p>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardDescription>Chapter</CardDescription>
        <CardTitle className="text-lg">No chapter linked</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>
          Register your chapter to manage its athletes and payments as a team.
        </p>
        <div className="mt-3">
          <Button size="sm" render={<Link href="/register-chapter" />}>
            Register your chapter
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.name ?? user.email}. Manage your chapter&apos;s
          athletes, event registration, and payment here.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {chapterCard}
        <Card>
          <CardHeader>
            <CardDescription>Athletes registered</CardDescription>
            <CardTitle className="text-lg">{athleteCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {chapter ? (
              <p>
                {athleteCount} athlete{athleteCount === 1 ? "" : "s"} on your roster.
              </p>
            ) : (
              <p>Link your chapter to add athletes.</p>
            )}
          </CardContent>
        </Card>
        {paymentCard}
        {nextTournamentCard}
      </div>
    </div>
  );
}
