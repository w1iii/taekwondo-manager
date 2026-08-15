"use client";

import { reportError } from "@/lib/log";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (typeof window === "undefined") {
    reportError("admin-page-crashed", { digest: error.digest }, error);
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          The error was recorded. Try again or return to the admin dashboard.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
        <a
          href="/admin"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to admin
        </a>
      </div>
    </div>
  );
}
