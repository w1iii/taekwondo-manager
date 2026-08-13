import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Organizer Overview" };

export default async function AdminOverviewPage() {
  const user = await requireRole("organizer");

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
            <CardTitle className="text-lg">0</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Chapter registry ships in M2.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Payments pending</CardDescription>
            <CardTitle className="text-lg">0</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Approval queue ships in M6.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Published events</CardDescription>
            <CardTitle className="text-lg">0</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Event CRUD ships in M3.
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