import "server-only";

import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";
import type { Role as AppRole } from "@/lib/roles";

export function toNotifRole(role: AppRole): Role {
  return role === "organizer" ? "ORGANIZER" : "COACH";
}

export async function notify(
  role: Role,
  targetChapterId: string | null,
  title: string,
  body: string | null = null,
  link: string | null = null,
): Promise<void> {
  await db.notification.create({
    data: { role, targetChapterId, title, body, link },
  });
}

export type BellItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: Date;
  read: boolean;
};

export async function listNotifications(
  role: Role,
  chapterId: string | null,
): Promise<{ items: BellItem[]; unreadCount: number }> {
  const where =
    role === "ORGANIZER"
      ? { role }
      : { role, targetChapterId: chapterId ?? "__none__" };

  const [rows, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ]);

  return {
    items: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: n.createdAt,
      read: n.readAt !== null,
    })),
    unreadCount,
  };
}