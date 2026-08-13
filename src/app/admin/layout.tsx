import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import type { NavItem } from "@/components/nav-link";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/chapters", label: "Chapters", icon: "Building2" },
  { href: "/admin/events", label: "Events", icon: "CalendarPlus" },
  { href: "/admin/payments", label: "Payments", icon: "ReceiptText" },
  { href: "/admin/athletes", label: "Athletes", icon: "Award" },
  { href: "/admin/brackets", label: "Brackets", icon: "Network" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("organizer");
  return (
    <AppShell user={user} role={user.role} nav={nav}>
      {children}
    </AppShell>
  );
}