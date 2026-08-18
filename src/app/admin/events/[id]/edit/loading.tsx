import { Card, CardContent } from "@/components/ui/card";

export default function EditEventLoading() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <div className="h-8 w-40 animate-shimmer rounded bg-muted" />
        <div className="mt-2 h-4 w-56 animate-shimmer rounded bg-muted" />
      </div>
      <div className="h-8 w-36 animate-shimmer rounded bg-muted" />
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
            <div className="h-10 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
            <div className="h-24 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
            <div className="h-10 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-40 animate-shimmer rounded bg-muted" />
            <div className="h-10 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-40 animate-shimmer rounded bg-muted" />
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="size-4 shrink-0 animate-shimmer rounded bg-muted" />
                  <div className="h-4 w-2/3 animate-shimmer rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-10 w-full animate-shimmer rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}