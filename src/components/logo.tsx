import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-white/80 hover:scale-105 transition-all",
        className
      )}
    >
      <span className="material-symbols-outlined text-action-redwood">
        sports_martial_arts
      </span>
      TKD ARENA
    </Link>
  );
}