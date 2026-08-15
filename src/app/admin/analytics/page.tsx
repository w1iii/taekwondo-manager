import { Activity, Eye, Filter, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChapterStatus, PaymentStatus } from "@/generated/prisma/client";

export const metadata = { title: "Analytics" };

type PathBucket = { path: string; views: number };

function summarizePath(path: string): string {
  if (path === "/") return "/ (landing)";
  const segments = path.split("/");
  if (segments.length <= 2) return path;
  // Collapse dynamic segments into a bucket: /dashboard/events/xyz → /dashboard/events/[id]
  const last = segments[segments.length - 1];
  if (last.length > 32 || /^[0-9a-f-]{20,}$/i.test(last)) {
    segments[segments.length - 1] = "[id]";
  }
  return segments.join("/");
}

export default async function AnalyticsPage() {
  await requireRole("organizer");

  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    pageViews,
    topPathsRaw,
    uniqueVisitors,
    anonViews,
    chapterSignups,
    approvedChapters,
    athletesAdded,
    enrollments,
    teamPayments,
    approvedPayments,
  ] = await Promise.all([
    db.pageView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.$queryRaw<PathBucket[]>`
      SELECT "path", count(*)::int AS views
      FROM "PageView"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY "path"
      ORDER BY views DESC
      LIMIT 12
    `,
    db.$queryRaw<{ visitors: number }[]>`
      SELECT count(DISTINCT "userId")::int AS visitors
      FROM "PageView"
      WHERE "createdAt" >= ${thirtyDaysAgo} AND "userId" IS NOT NULL
    `,
    db.pageView.count({ where: { createdAt: { gte: thirtyDaysAgo }, userId: null } }),
    db.chapter.count(),
    db.chapter.count({ where: { status: ChapterStatus.APPROVED } }),
    db.athlete.count(),
    db.enrollment.count(),
    db.teamPayment.count(),
    db.teamPayment.count({ where: { status: PaymentStatus.APPROVED } }),
  ]);

  const topPaths: PathBucket[] = [];
  const seen = new Map<string, number>();
  for (const row of topPathsRaw) {
    const key = summarizePath(row.path);
    const existing = seen.get(key) ?? 0;
    const merged = existing + row.views;
    seen.set(key, merged);
  }
  for (const [path, views] of [...seen.entries()].sort((a, b) => b[1] - a[1])) {
    topPaths.push({ path, views });
  }

  // Registration funnel: from landing page to a completed payment.
  const funnel = [
    { label: "Chapter registrations", value: chapterSignups, hint: "Chapters created" },
    { label: "Chapters approved", value: approvedChapters, hint: "By organizer" },
    { label: "Athletes added", value: athletesAdded, hint: "Across all rosters" },
    { label: "Event enrollments", value: enrollments, hint: "Athletes entered" },
    { label: "Payments submitted", value: teamPayments, hint: "For enrolled teams" },
    { label: "Payments approved", value: approvedPayments, hint: "Fully onboarded" },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Lightweight usage analytics from the in-app page-view beacon. Data
          reflects the last 30 days unless noted.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1">
              <Eye className="size-3.5" /> Page views (30d)
            </CardDescription>
            <CardTitle className="text-lg">{pageViews}</CardTitle>
            <CardContent className="px-0 pb-0 text-sm text-muted-foreground">
              {anonViews} anonymous
            </CardContent>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1">
              <Users className="size-3.5" /> Unique visitors
            </CardDescription>
            <CardTitle className="text-lg">{uniqueVisitors[0]?.visitors ?? 0}</CardTitle>
            <CardContent className="px-0 pb-0 text-sm text-muted-foreground">
              Signed-in users, 30d
            </CardContent>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1">
              <Activity className="size-3.5" /> Bookings completed
            </CardDescription>
            <CardTitle className="text-lg">{approvedPayments}</CardTitle>
            <CardContent className="px-0 pb-0 text-sm text-muted-foreground">
              Paid + approved teams
            </CardContent>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1">
              <Filter className="size-3.5" /> Chapters
            </CardDescription>
            <CardTitle className="text-lg">{chapterSignups}</CardTitle>
            <CardContent className="px-0 pb-0 text-sm text-muted-foreground">
              {approvedChapters} approved
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="m-4 text-sm font-semibold">Top pages (30d)</CardTitle>
          {topPaths.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">
              No page views recorded yet.
            </CardContent>
          ) : (
            <CardContent className="space-y-2">
              {topPaths.map((row) => (
                <div key={row.path} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-mono text-xs">{row.path}</span>
                  <span className="shrink-0 text-muted-foreground">{row.views}</span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardTitle className="m-4 text-sm font-semibold">
            Registration funnel
          </CardTitle>
          <CardContent className="space-y-4">
            {funnel.map((step, i) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{step.label}</span>
                  <span className="font-medium">{step.value.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${Math.round((step.value / maxFunnel) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Step {i + 1}: {step.hint}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}