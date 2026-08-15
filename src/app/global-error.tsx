"use client";

import { reportError } from "@/lib/log";

/**
 * Only catches errors from the root layout — the App Router's catch-all
 * boundary for unexpected render/action errors. Logs the raw error (server
 * actions run before hydration, so this doubles as the server-error sink)
 * and shows the user a kept-alive page instead of a bare error screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (typeof window === "undefined") {
    reportError("page-crashed", { digest: error.digest }, error);
  }

  return (
    <html>
      <body className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            The error was recorded. If it keeps happening, contact support.
          </p>
          <button
            onClick={reset}
            className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}