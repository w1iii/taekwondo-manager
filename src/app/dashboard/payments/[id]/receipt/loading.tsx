import { Card, CardContent } from "@/components/ui/card";

export default function PaymentReceiptLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-2 text-right">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-px animate-pulse bg-muted" />
          <div className="space-y-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="h-px animate-pulse bg-muted" />
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}