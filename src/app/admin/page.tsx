import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChapterStatus } from "@/generated/prisma/client";

export const metadata = { title: "Organizer Overview" };

export default async function AdminOverviewPage() {
  const user = await requireRole("organizer");

  const [pendingChapters, approvedChapters, totalChapters] = await Promise.all([
    db.chapter.count({ where: { status: ChapterStatus.PENDING } }),
    db.chapter.count({ where: { status: ChapterStatus.APPROVED } }),
    db.chapter.count(),
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
            <CardDescription>Total registrations</CardDescription>
            <CardTitle className="text-lg">{totalChapters}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            All submitted chapter registrations.
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