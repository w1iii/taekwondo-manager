import { Card, CardContent } from "@/components/ui/card";

export default function RosterLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-shimmer rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-shimmer rounded bg-muted" />
      </div>

      <section className="space-y-3">
        <div className="h-4 w-28 animate-shimmer rounded bg-muted" />
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center gap-2">
        <div className="h-8 w-full animate-shimmer rounded bg-muted" />
        <div className="h-8 w-20 animate-shimmer rounded bg-muted" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="h-4 w-44 animate-shimmer rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-8 w-16 animate-shimmer rounded bg-muted" />
                <div className="h-8 w-16 animate-shimmer rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}