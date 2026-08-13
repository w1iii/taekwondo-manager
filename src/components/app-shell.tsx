import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLink, type NavItem } from "@/components/nav-link";
import type { SessionUser } from "@/lib/auth";
import type { Role } from "@/lib/roles";

export function AppShell({
  user,
  role,
  nav,
  children,
}: {
  user: SessionUser;
  role: Role;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Open navigation" />}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 space-y-1">
                {nav.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <Link href="/" className="text-sm font-semibold tracking-tight">
          Taekwondo Tournament Manager
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right text-sm sm:block">
            <p className="font-medium leading-tight">{user.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
            {role}
          </Badge>
          <UserButton />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 border-r bg-muted/30 md:block">
          <nav className="sticky top-14 space-y-1 p-3">
            {nav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}