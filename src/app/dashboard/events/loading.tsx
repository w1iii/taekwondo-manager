import { Card, CardContent } from "@/components/ui/card";

export default function EventsLoading() {
  const card = (key: number) => (
    <Card key={key}>
      <CardContent className="p-0">
        <div className="h-28 animate-pulse rounded-t-[inherit] bg-muted" />
        <div className="space-y-3 p-4">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => card(i))}
      </div>
    </div>
  );
}