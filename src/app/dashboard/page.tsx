import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { claimChapterForUser, getChapterForUser, CHAPTER_STATUS_LABELS } from "@/lib/chapters";
import { ChapterStatus } from "@/generated/prisma/client";

export const metadata = { title: "Coach Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireRole("coach");
  await claimChapterForUser(user);
  const chapter = await getChapterForUser(user);

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
            <CardTitle className="text-lg">0</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add athletes once enrollment is live.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Payment status</CardDescription>
            <CardTitle className="text-lg">—</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Shown once payments exist.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Next tournament</CardDescription>
            <CardTitle className="text-lg">—</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Driven by the event calendar.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
