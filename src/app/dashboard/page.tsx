import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { requireRole } from "@/lib/auth";
import { claimChapterForUser, getChapterForUser, CHAPTER_STATUS_LABELS } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { ChapterStatus, EventStatus } from "@/generated/prisma/client";

export const metadata = { title: "Coach Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireRole("coach");
  await claimChapterForUser(user);
  const chapter = await getChapterForUser(user);

  const [athleteCount, nextEvent, latestOrder] = await Promise.all([
    chapter ? db.athlete.count({ where: { chapterId: chapter.id } }) : Promise.resolve(0),
    db.event.findFirst({
      where: { status: EventStatus.PUBLISHED, eventDate: { gte: new Date() } },
      orderBy: { eventDate: "asc" },
    }),
    chapter
      ? db.order.findFirst({
          where: { chapterId: chapter.id },
          include: { event: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const paymentCard =
    nextEvent && chapter ? (
      <Card className="card-hover">
        <CardHeader>
          <CardDescription>Payment status</CardDescription>
          <CardTitle className="text-lg">
            {latestOrder ? (
              <Badge
                variant={
                  latestOrder.status === "APPROVED" ? "default" : "secondary"
                }
              >
                {latestOrder.status === "APPROVED"
                  ? "Approved"
                  : latestOrder.status === "PAID"
                    ? "Pending review"
                    : latestOrder.status === "REJECTED"
                      ? "Rejected"
                      : "Pending payment"}
              </Badge>
            ) : (
              "Not submitted"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {latestOrder ? (
            <p>
              {latestOrder.status === "APPROVED"
                ? "Your team registration is confirmed."
                : latestOrder.status === "PAID"
                  ? "Your payment is under review."
                  : "Submit payment for your registered athletes."}
            </p>
          ) : (
            <p>
              Register your team for the next event.
            </p>
          )}
        </CardContent>
      </Card>
    ) : (
      <Card className="card-hover">
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
    <Card className="card-hover">
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
    <Card className="card-hover">
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
    <Card className="card-hover">
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
    <Card className="card-hover">
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
      <Reveal>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.name ?? user.email}. Manage your chapter&apos;s
            athletes, event registration, and payment here.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={80}>{chapterCard}</Reveal>
        <Reveal delay={160}>
          <Card className="card-hover">
            <CardHeader>
              <CardDescription>Athletes registered</CardDescription>
              <CardTitle className="text-lg">
                <CountUp value={athleteCount} />
              </CardTitle>
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
        </Reveal>
        <Reveal delay={240}>{paymentCard}</Reveal>
        <Reveal delay={320}>{nextTournamentCard}</Reveal>
      </div>
    </div>
  );
}
