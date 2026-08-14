import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

function NavButton({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button render={<Link href={href} />} variant="outline" size="sm">
      {children}
    </Button>
  );
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <NavButton href={buildHref(page - 1)} disabled={page <= 1}>
          <ChevronLeft />
          Previous
        </NavButton>
        <NavButton href={buildHref(page + 1)} disabled={page >= totalPages}>
          Next
          <ChevronRight />
        </NavButton>
      </div>
    </div>
  );
}
