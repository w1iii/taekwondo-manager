"use server";

import { db } from "@/lib/db";
import { isProvince } from "@/lib/provinces";
import { requireUser } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";
import { ChapterStatus } from "@/generated/prisma/client";

export type RegisterState = { ok: true } | { ok: false; error: string };

const MAX_LOGO_BYTES = 15 * 1024 * 1024;

function normalizeGcash(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const withPrefix = digits.length === 10 && digits.startsWith("9") ? `0${digits}` : digits;
  return /^09\d{9}$/.test(withPrefix) ? withPrefix : null;
}

export async function registerChapter(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const province = (formData.get("province") as string | null) ?? "";
  const city = (formData.get("city") as string | null)?.trim() ?? "";
  const gcashNumber = (formData.get("gcashNumber") as string | null) ?? "";
  const headCoachName = (formData.get("headCoachName") as string | null)?.trim() ?? "";
  const logo = formData.get("logo");

  const user = await requireUser();
  const headCoachEmail = user.email;
  if (!headCoachEmail) {
    return { ok: false, error: "Could not read your account email. Please sign out and back in." };
  }

  if (name.length < 2) {
    return { ok: false, error: "Enter your chapter or gym name." };
  }
  if (!isProvince(province)) {
    return { ok: false, error: "Pick a province from the list." };
  }
  if (city.length < 2) {
    return { ok: false, error: "Enter the city or municipality." };
  }
  const gcash = normalizeGcash(gcashNumber);
  if (!gcash) {
    return { ok: false, error: "GCash number must be a valid 11-digit PH mobile number." };
  }
  if (headCoachName.length < 2) {
    return { ok: false, error: "Enter the head coach's full name." };
  }

  let logoUrl: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) {
      return { ok: false, error: "The logo must be an image file." };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { ok: false, error: "Logo must be 15 MB or smaller." };
    }
    try {
      logoUrl = await saveUpload(logo, "chapters");
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Logo upload failed.",
      };
    }
  }

  try {
    await db.chapter.create({
      data: {
        name,
        province,
        city,
        gcashNumber: gcash,
        logoUrl,
        headCoachName,
        headCoachEmail,
        status: ChapterStatus.PENDING,
      },
    });
  } catch (error) {
    const isDuplicate = error instanceof Error && error.message.includes("Unique constraint");
    if (isDuplicate) {
      return {
        ok: false,
        error: "This email already has an active chapter registration.",
      };
    }
    return { ok: false, error: "Could not save your registration. Please try again." };
  }

  return { ok: true };
}
