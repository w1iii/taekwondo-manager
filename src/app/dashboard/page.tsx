import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Coach Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireRole("coach");

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
        <Card>
          <CardHeader>
            <CardDescription>Chapter</CardDescription>
            <CardTitle className="text-lg">—</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assigned in a later milestone.
          </CardContent>
        </Card>
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