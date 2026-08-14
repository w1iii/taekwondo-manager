"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toNotifRole } from "@/lib/notifications";

export async function markNotificationsRead(): Promise<void> {
  const user = await requireUser();
  const role = toNotifRole(user.role);

  const where =
    role === "ORGANIZER"
      ? { role }
      : { role, targetChapterId: user.chapterId ?? "__none__" };

  await db.notification.updateMany({
    where: { ...where, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}