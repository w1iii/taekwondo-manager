import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex flex-col items-center gap-1 text-center",
        className
      )}
    >
      <span className="text-2xl leading-none">🥋</span>
      <span className="text-sm font-semibold tracking-tight">
        Taekwondo Tournament Manager
      </span>
    </Link>
  );
}