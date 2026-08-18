import { Card } from "@/components/ui/card";

export default function BracketsCoachEventLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-3 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </form>

      <Card>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="size-4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}