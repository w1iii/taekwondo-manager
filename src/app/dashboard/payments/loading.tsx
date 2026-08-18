import { Card, CardContent } from "@/components/ui/card";

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-72 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}