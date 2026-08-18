import { Card, CardContent } from "@/components/ui/card";

export default function RegisterChapterLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center gap-4 border-b px-4 sm:px-8">
        <div className="size-6 animate-shimmer rounded bg-muted" />
        <div className="h-5 w-24 animate-shimmer rounded bg-muted" />
        <div className="ml-auto h-9 w-32 animate-shimmer rounded bg-muted" />
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-8">
        <div className="h-8 w-64 animate-shimmer rounded bg-muted" />
        <Card className="mt-8">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 animate-shimmer rounded bg-muted" />
              <div className="h-10 w-full animate-shimmer rounded bg-muted" />
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
            <div className="h-10 w-full animate-shimmer rounded bg-muted" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}