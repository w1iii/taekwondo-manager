"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navIcons, type NavIconName } from "@/components/nav-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

export function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = navIcons[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-0 -translate-y-1/2 rounded-full bg-accent transition-all duration-200 group-hover:h-0 motion-reduce:transition-none",
          active && "h-1/2"
        )}
      />
      <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
      <span>{item.label}</span>
    </Link>
  );
}