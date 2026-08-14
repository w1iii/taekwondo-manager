import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChapterForUser } from "@/lib/chapters";
import { getStoredFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";

async function canAccessPayment(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  payment: { chapterId: string },
): Promise<boolean> {
  if (user.role === "organizer") return true;
  if (user.role !== "coach") return false;
  if (payment.chapterId === user.chapterId) return true;
  const chapter = await getChapterForUser(user);
  return chapter !== null && chapter.id === payment.chapterId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const payment = await db.teamPayment.findUnique({ where: { id } });
  if (!payment) return new Response("Not found", { status: 404 });

  if (!(await canAccessPayment(user, payment))) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = await getStoredFile(payment.proofUrl);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}