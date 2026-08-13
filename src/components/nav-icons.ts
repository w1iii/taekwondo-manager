import {
  Award,
  Building2,
  CalendarPlus,
  LayoutDashboard,
  ListChecks,
  Network,
  Receipt,
  ReceiptText,
  Users,
} from "lucide-react";

export const navIcons = {
  Award,
  Building2,
  CalendarPlus,
  LayoutDashboard,
  ListChecks,
  Network,
  Receipt,
  ReceiptText,
  Users,
} as const;

export type NavIconName = keyof typeof navIcons;