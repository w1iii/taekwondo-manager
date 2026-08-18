import { Card, CardContent } from "@/components/ui/card";

export default function PaymentProofAdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-44 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-9 w-32 animate-shimmer rounded bg-muted" />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="h-5 w-40 animate-shimmer rounded bg-muted" />
          <div className="h-8 w-full animate-shimmer rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-1/2 animate-shimmer rounded bg-muted" />
            <div className="h-4 w-1/3 animate-shimmer rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 animate-shimmer rounded bg-muted" />
            <div className="h-9 w-32 animate-shimmer rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}