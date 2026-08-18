import { Card, CardContent } from "@/components/ui/card";

export default function AuthLoading() {
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardContent className="space-y-5 p-8">
          <div className="mx-auto size-12 animate-pulse rounded-full bg-muted" />
          <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}