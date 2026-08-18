import { Card, CardContent } from "@/components/ui/card";

export default function DivisionsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-64 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-shimmer rounded bg-muted" />
      </div>

      <Card>
        <CardContent>
          <div className="h-4 w-3/4 animate-shimmer rounded bg-muted" />
        </CardContent>
      </Card>

      <form className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
          <div className="h-8 w-full animate-shimmer rounded bg-muted" />
        </div>
        <div className="w-36 space-y-1.5">
          <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
          <div className="h-8 w-full animate-shimmer rounded bg-muted" />
        </div>
        <div className="w-36 space-y-1.5">
          <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
          <div className="h-8 w-full animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-8 w-20 animate-shimmer rounded bg-muted" />
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 py-4">
              <div className="h-5 w-3/4 animate-shimmer rounded bg-muted" />
              <div className="h-3 w-2/3 animate-shimmer rounded bg-muted" />
              <div className="h-8 w-32 animate-shimmer rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}