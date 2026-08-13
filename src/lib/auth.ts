import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { DEFAULT_ROLE, isRole, type Role } from "@/lib/roles";

export type SessionUser = {
  userId: string;
  name?: string;
  email?: string;
  role: Role;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    if (!user) return null;

    const metadata = user.publicMetadata as { role?: unknown } | undefined;
    const role = isRole(metadata?.role) ? metadata.role : DEFAULT_ROLE;

    return {
      userId,
      name: user.fullName ?? undefined,
      email: user.primaryEmailAddress?.emailAddress ?? undefined,
      role,
    };
  } catch {
    return null;
  }
});

export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
});

export const requireRole = cache(async (role: Role): Promise<SessionUser> => {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(role === "organizer" ? "/dashboard" : "/admin");
  }
  return user;
});