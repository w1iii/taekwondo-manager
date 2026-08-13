import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChapterStatus } from "@/generated/prisma/client";
import { ChapterDirectory } from "./chapter-directory";

export const metadata = { title: "Directory" };

export default async function DirectoryPage() {
  await requireRole("coach");

  const chapters = await db.chapter.findMany({
    where: { status: ChapterStatus.APPROVED },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      province: true,
      city: true,
      logoUrl: true,
      headCoachName: true,
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chapter Directory</h1>
        <p className="text-sm text-muted-foreground">
          Every approved chapter registered for the tournament. Search or filter
          by province.
        </p>
      </div>
      <ChapterDirectory chapters={chapters} />
    </div>
  );
}
