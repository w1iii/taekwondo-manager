import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChapterStatus, EventStatus, PaymentStatus } from "@/generated/prisma/client";

export const metadata = { title: "Organizer Overview" };

export default async function AdminOverviewPage() {
  const user = await requireRole("organizer");

  const [pendingChapters, approvedChapters, publishedEvents, pendingPayments] =
    await Promise.all([
      db.chapter.count({ where: { status: ChapterStatus.PENDING } }),
      db.chapter.count({ where: { status: ChapterStatus.APPROVED } }),
      db.event.count({ where: { status: EventStatus.PUBLISHED } }),
      db.teamPayment.count({ where: { status: PaymentStatus.PENDING } }),
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
            <CardTitle className="text-lg">0</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Seeded with fixed WT classes in M10.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}