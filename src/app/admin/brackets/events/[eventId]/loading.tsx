export default function AdminEventBracketsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-8 w-64 animate-shimmer rounded bg-muted" />
          <div className="mt-2 h-4 w-72 animate-shimmer rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-shimmer rounded bg-muted" />
      </div>

      <section className="space-y-3">
        <div className="h-4 w-32 animate-shimmer rounded bg-muted" />

        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
            <div className="h-8 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="w-36 space-y-1.5">
            <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
            <div className="h-8 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="w-36 space-y-1.5">
            <div className="h-3 w-16 animate-shimmer rounded bg-muted" />
            <div className="h-8 w-full animate-shimmer rounded bg-muted" />
          </div>
          <div className="h-8 w-20 animate-shimmer rounded bg-muted" />
        </form>

        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="rounded-lg border bg-card p-3">
              <div className="space-y-2">
                <div className="h-4 w-48 animate-shimmer rounded bg-muted" />
                <div className="h-3 w-64 animate-shimmer rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}