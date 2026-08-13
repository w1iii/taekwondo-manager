import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { claimChapterForUser } from "@/lib/chapters";
import type { NavItem } from "@/components/nav-link";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
  { href: "/dashboard/roster", label: "My Roster", icon: "Users" },
  { href: "/dashboard/events", label: "Register for Event", icon: "ListChecks" },
  { href: "/dashboard/payments", label: "Team Payment", icon: "Receipt" },
  { href: "/dashboard/directory", label: "Directory", icon: "Users" },
  { href: "/dashboard/brackets", label: "Brackets & Schedule", icon: "Network" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("coach");
  await claimChapterForUser(user);
  return (
    <AppShell user={user} role={user.role} nav={nav}>
      {children}
    </AppShell>
  );
}