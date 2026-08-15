import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_PATH_LENGTH = 200;

/**
 * Page-view beacon. Called by the client tracker on every route change. Kept
 * minimal and fire-and-forget: a bad path or a write failure must never break
 * navigation. Cleans up query strings/hashes so the aggregation buckets stay
 * clean (e.g. /dashboard/events/abc…, not ?query=).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const rawPath = typeof body?.path === "string" ? body.path : "";
  const path = rawPath.split(/[?#]/, 1)[0].slice(0, MAX_PATH_LENGTH);
  if (!path.startsWith("/")) return new Response("Bad request", { status: 400 });

  const user = await getCurrentUser().catch(() => null);
  const role = user?.role === "organizer" ? "ORGANIZER" : user?.role === "coach" ? "COACH" : null;

  try {
    await db.pageView.create({
      data: {
        path,
        role,
        userId: user?.userId ?? null,
        chapterId: user?.chapterId ?? null,
      },
    });
  } catch {
    // Analytics must never affect the UX — swallow write errors.
  }

  return NextResponse.json({ ok: true });
}