import { Card, CardContent } from "@/components/ui/card";

export default function DivisionBracketLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-56 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-80 animate-shimmer rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-shimmer rounded bg-muted" />
          <div className="h-9 w-36 animate-shimmer rounded bg-muted" />
          <div className="h-9 w-20 animate-shimmer rounded bg-muted" />
        </div>
      </div>

      <div className="h-14 animate-shimmer rounded-lg bg-muted" />

      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="flex flex-1 flex-col gap-4">
            <div className="h-3 w-12 animate-shimmer rounded bg-muted" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 py-3">
                  <div className="h-4 w-28 animate-shimmer rounded bg-muted" />
                  <div className="h-3 w-20 animate-shimmer rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}