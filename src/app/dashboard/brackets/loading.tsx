import { Card, CardContent } from "@/components/ui/card";

export default function BracketsCoachLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="h-8 w-64 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-8 w-64 animate-shimmer rounded bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 py-4">
              <div className="h-5 w-3/4 animate-shimmer rounded bg-muted" />
              <div className="h-4 w-1/2 animate-shimmer rounded bg-muted" />
              <div className="h-9 w-full animate-shimmer rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}