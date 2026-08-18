import { Card, CardContent } from "@/components/ui/card";

export default function DirectoryLoading() {
  return (
    <div className="space-y-4">
      <div>
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="h-9 w-full max-w-xs animate-pulse rounded bg-muted" />
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="size-12 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}