import { Card, CardContent } from "@/components/ui/card";

export default function AthleteDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
      </div>

      <Card>
        <CardContent className="space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 py-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}