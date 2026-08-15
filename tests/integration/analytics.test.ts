import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "@/app/api/analytics/view/route";

import { resetDb } from "./helpers";

function beacon(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analytics/view", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("analytics view beacon", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records an anonymous view when signed out", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);

    const res = await POST(beacon({ path: "/" }));
    expect(res.status).toBe(200);

    const views = await db.pageView.findMany();
    expect(views).toHaveLength(1);
    expect(views[0].path).toBe("/");
    expect(views[0].userId).toBeNull();
    expect(views[0].role).toBeNull();
  });

  it("records the actor when signed in and strips query strings", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-coach-1",
      email: "coach@test.ph",
      role: "coach",
      chapterId: "chapter-1",
    } as never);

    const res = await POST(beacon({ path: "/dashboard/events/abc?page=2#top" }));
    expect(res.status).toBe(200);

    const views = await db.pageView.findMany();
    expect(views).toHaveLength(1);
    expect(views[0].path).toBe("/dashboard/events/abc");
    expect(views[0].userId).toBe("user-coach-1");
    expect(views[0].role).toBe("COACH");
    expect(views[0].chapterId).toBe("chapter-1");
  });

  it("returns 400 for a non-path body", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);

    const res = await POST(beacon({}));
    expect(res.status).toBe(400);
    expect(await db.pageView.count()).toBe(0);
  });

  it("records ORGANIZER role for organizer sessions", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-org-1",
      email: "org@test.ph",
      role: "organizer",
    } as never);

    await POST(beacon({ path: "/admin/analytics" }));

    const views = await db.pageView.findMany();
    expect(views[0].role).toBe("ORGANIZER");
  });
});