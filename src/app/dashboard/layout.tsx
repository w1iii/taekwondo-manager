import { AppShell } from "@/components/app-shell";
import { requireRole, type SessionUser } from "@/lib/auth";
import { claimChapterForUser, getChapterForUser } from "@/lib/chapters";
import { listNotifications, toNotifRole } from "@/lib/notifications";
import { NotificationBell } from "@/components/notification-bell";
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
  const chapter = await claimAndGetChapter(user);
  const { items, unreadCount } = await listNotifications(toNotifRole(user.role), chapter?.id ?? null);
  return (
    <AppShell
      user={user}
      role={user.role}
      nav={nav}
      bell={<NotificationBell items={items} unreadCount={unreadCount} />}
    >
      {children}
    </AppShell>
  );
}

async function claimAndGetChapter(user: SessionUser) {
  await claimChapterForUser(user);
  return getChapterForUser(user);
}