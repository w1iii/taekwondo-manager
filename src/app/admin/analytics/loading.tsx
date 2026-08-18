import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-7 w-16 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="m-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </CardTitle>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-8 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="m-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          </CardTitle>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}