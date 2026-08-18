import { Card, CardContent } from "@/components/ui/card";

export default function EventRegistrationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-64 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-80 animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-9 w-32 animate-shimmer rounded bg-muted" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 py-4">
              <div className="space-y-2">
                <div className="h-5 w-56 animate-shimmer rounded bg-muted" />
                <div className="h-4 w-40 animate-shimmer rounded bg-muted" />
              </div>
              <div className="h-24 animate-shimmer rounded-lg bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}