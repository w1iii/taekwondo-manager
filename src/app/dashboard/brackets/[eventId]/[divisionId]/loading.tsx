import { Card, CardContent } from "@/components/ui/card";

export default function BracketsCoachBracketLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-4 w-48 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-8 w-64 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-40 animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-shimmer rounded bg-muted" />
      </div>

      <div className="h-3 w-96 animate-shimmer rounded bg-muted" />

      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 3 }).map((_, col) => (
          <div
            key={col}
            className="animate-enter motion-reduce:animate-none flex flex-1 flex-col gap-4"
            style={{ animationDelay: `${col * 100}ms` }}
          >
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