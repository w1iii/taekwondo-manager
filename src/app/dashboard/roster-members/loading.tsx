import { Card, CardContent } from "@/components/ui/card";

export default function RosterMembersLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-56 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}