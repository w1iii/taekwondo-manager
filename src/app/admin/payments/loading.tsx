import { Card, CardContent } from "@/components/ui/card";

export default function PaymentsAdminLoading() {
  const paymentCard = (key: number) => (
    <Card key={key}>
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 shrink-0 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {Array.from({ length: 2 }).map((_, section) => (
        <section key={section} className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => paymentCard(section * 10 + i))}
          </div>
        </section>
      ))}
    </div>
  );
}