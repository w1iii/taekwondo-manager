"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportError } from "@/lib/log";
import { ChapterStatus } from "@/generated/prisma/client";

export async function approveChapter(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireRole("organizer");

  try {
    await db.chapter.update({
      where: { id },
      data: { status: ChapterStatus.APPROVED, rejectionReason: null },
    });
  } catch (error) {
    reportError("approve-chapter-failed", { chapterId: id }, error);
    return;
  }

  revalidateTag("chapters", "max");
  revalidatePath("/admin/chapters");
  revalidatePath("/admin");
}

export async function rejectChapter(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return;

  await requireRole("organizer");

  try {
    await db.chapter.update({
      where: { id },
      data: { status: ChapterStatus.REJECTED, rejectionReason: reason || null },
    });
  } catch (error) {
    reportError("reject-chapter-failed", { chapterId: id }, error);
    return;
  }

  revalidateTag("chapters", "max");
  revalidatePath("/admin/chapters");
  revalidatePath("/admin");
}
