import { Card, CardContent } from "@/components/ui/card";

export default function EventRegisterLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
      </div>

      <Card>
        <CardContent className="space-y-2">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <Card>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}