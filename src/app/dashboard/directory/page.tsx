import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChapterStatus } from "@/generated/prisma/client";
import { Pagination } from "@/components/pagination";
import {
  pageCount,
  pageHref,
  clampPage,
  parsePage,
} from "@/lib/pagination";
import { isProvince } from "@/lib/provinces";
import { ChapterDirectory } from "./chapter-directory";

export const metadata = { title: "Directory" };

const DIRECTORY_PAGE_SIZE = 12;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; province?: string; page?: string }>;
}) {
  await requireRole("coach");

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const province = isProvince(params.province) ? params.province : "";
  const requestedPage = parsePage(params.page);

  const where = {
    status: ChapterStatus.APPROVED,
    province: province || undefined,
    OR: query
      ? [
          { name: { contains: query, mode: "insensitive" as const } },
          { city: { contains: query, mode: "insensitive" as const } },
        ]
      : undefined,
  } as const;

  const [chapters, totalChapters] = await Promise.all([
    db.chapter.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (requestedPage - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        province: true,
        city: true,
        logoUrl: true,
        headCoachName: true,
      },
    }),
    db.chapter.count({ where }),
  ]);

  const totalPages = pageCount(totalChapters, DIRECTORY_PAGE_SIZE);
  const page = clampPage(requestedPage, totalPages);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chapter Directory</h1>
        <p className="text-sm text-muted-foreground">
          Every approved chapter registered for the tournament. Search or filter
          by province.
        </p>
      </div>
      <ChapterDirectory chapters={chapters} query={query} province={province} />
      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) =>
          pageHref(
            {
              q: query || undefined,
              province: province || undefined,
            },
            "page",
            p,
          )
        }
      />
    </div>
  );
}