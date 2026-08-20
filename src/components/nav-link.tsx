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

export function NavLink({
  item,
  items,
  onClick,
}: {
  item: NavItem;
  items: NavItem[];
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(item.href, pathname, items);
  const Icon = navIcons[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 py-2 pl-4 pr-3 text-sm font-medium transition-colors duration-200",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(href: string, pathname: string, items: NavItem[]): boolean {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  if (matches.length === 0) return false;
  const deepest = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return deepest.href === href;
}