import { vi } from "vitest";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://wii@localhost:5432/taekwondo_test";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
  requireRole: vi.fn(),
}));
