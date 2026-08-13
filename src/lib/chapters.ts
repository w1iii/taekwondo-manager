import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { ChapterStatus } from "@/generated/prisma/client";

export const CHAPTER_STATUS_LABELS: Record<ChapterStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/**
 * Finds the chapter a coach belongs to. A coach is linked either via
 * Clerk metadata (after claiming) or by matching an approved chapter that
 * still lists their email as the unclaimed head coach.
 */
export async function getChapterForUser(user: SessionUser) {
  if (user.chapterId) {
    return db.chapter.findUnique({ where: { id: user.chapterId } });
  }

  if (!user.email) return null;

  return db.chapter.findFirst({
    where: {
      headCoachEmail: user.email,
      status: ChapterStatus.APPROVED,
      OR: [{ headCoachUserId: null }, { headCoachUserId: user.userId }],
    },
  });
}

/**
 * One-time link between an approved chapter and the signed-in head coach.
 * Runs on every dashboard visit but exits early once metadata has a chapterId.
 * Clerk metadata must be set server-side; signing up alone only grants the
 * default coach role, so linking happens here, not during sign-up.
 */
export async function claimChapterForUser(user: SessionUser): Promise<void> {
  if (user.chapterId || !user.email) return;

  const chapter = await db.chapter.findFirst({
    where: {
      headCoachEmail: user.email,
      status: ChapterStatus.APPROVED,
      headCoachUserId: null,
    },
  });
  if (!chapter) return;

  await db.chapter.update({
    where: { id: chapter.id },
    data: { headCoachUserId: user.userId },
  });

  const client = await clerkClient();
  await client.users.updateUserMetadata(user.userId, {
    publicMetadata: { role: "coach", chapterId: chapter.id },
  });
}
