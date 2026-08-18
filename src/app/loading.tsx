import { Card, CardContent } from "@/components/ui/card";

export default function RootLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-16 px-6 py-12">
      <div className="space-y-6">
        <div className="h-14 w-40 animate-shimmer rounded bg-muted" />
        <div className="h-8 w-3/4 max-w-lg animate-shimmer rounded bg-muted" />
        <div className="h-4 w-2/3 max-w-md animate-shimmer rounded bg-muted" />
      </div>

      <section className="space-y-4">
        <div className="h-7 w-48 animate-shimmer rounded bg-muted" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="animate-enter motion-reduce:animate-none"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent className="space-y-3 p-5">
                <div className="h-40 animate-shimmer rounded-lg bg-muted" />
                <div className="h-5 w-3/4 animate-shimmer rounded bg-muted" />
                <div className="h-4 w-2/3 animate-shimmer rounded bg-muted" />
                <div className="h-4 w-1/2 animate-shimmer rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}