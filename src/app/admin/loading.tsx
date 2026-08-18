import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardDescription>
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </CardDescription>
              <CardTitle className="text-lg">
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}