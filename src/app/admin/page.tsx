import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChapterStatus, EventStatus } from "@/generated/prisma/client";

export const metadata = { title: "Organizer Overview" };

export default async function AdminOverviewPage() {
  const user = await requireRole("organizer");

  const [pendingChapters, approvedChapters, publishedEvents, pendingPayments, divisionCount, weightClassCount] =
    await Promise.all([
      db.chapter.count({ where: { status: ChapterStatus.PENDING } }),
      db.chapter.count({ where: { status: ChapterStatus.APPROVED } }),
      db.event.count({ where: { status: EventStatus.PUBLISHED } }),
      db.paymentAttempt.count({ where: { outcome: "PENDING" } }),
      db.division.count(),
      db.weightClass.count(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizer Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {user.name ?? user.email}. Approve chapters and payments, set
          up events and divisions, and run the live tournaments.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Chapters pending</CardDescription>
            <CardTitle className="text-lg">{pendingChapters}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Waiting for your approval.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Chapters approved</CardDescription>
            <CardTitle className="text-lg">{approvedChapters}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Head coaches can sign in and register teams.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Published events</CardDescription>
            <CardTitle className="text-lg">{publishedEvents}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Live for coach registration.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Payments pending</CardDescription>
            <CardTitle className="text-lg">{pendingPayments}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Waiting for your approval.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Divisions</CardDescription>
            <CardTitle className="text-lg">{divisionCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generated from WT age groups and weight classes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Weight classes</CardDescription>
            <CardTitle className="text-lg">{weightClassCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            WT Senior table reused across age bands.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
