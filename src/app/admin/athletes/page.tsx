import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { GENDER_OPTIONS, genderLabel, beltLabel } from "@/lib/athletes";
import { Gender } from "@/generated/prisma/client";
import { Pagination } from "@/components/pagination";
import {
  PAGE_SIZE,
  pageCount,
  pageHref,
  clampPage,
  parsePage,
} from "@/lib/pagination";


export const metadata = { title: "Athletes" };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AthletesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    gender?: string;
    chapter?: string;
    division?: string;
    page?: string;
  }>;
}) {
  await requireRole("organizer");

  const { q, gender, chapter, division, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const genderFilter = (gender === "MALE" || gender === "FEMALE" ? gender : undefined) as
    | "MALE"
    | "FEMALE"
    | undefined;
  const chapterFilter = chapter?.trim() || undefined;
  const divisionId = division?.trim() || undefined;

  const [chapters, divisions] = await Promise.all([
    db.chapter.findMany({
      where: { status: "APPROVED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.division.findMany({
      include: { event: true },
      orderBy: [{ event: { eventDate: "desc" } }, { name: "asc" }],
    }),
  ]);

  let divisionFilter: { gender: string; eventId: string; birthYearMin: number; birthYearMax: number } | undefined;
  const selectedDivision = divisionId
    ? divisions.find((d) => d.id === divisionId)
    : undefined;
  if (selectedDivision) {
    const year = selectedDivision.event.eventDate.getFullYear();
    divisionFilter = {
      gender: selectedDivision.gender,
      eventId: selectedDivision.eventId,
      birthYearMin: selectedDivision.maxAge != null ? year - selectedDivision.maxAge : 1900,
      birthYearMax: selectedDivision.minAge != null ? year - selectedDivision.minAge : year,
    };
  }

  const athletesWhere = {
    name: query ? { contains: query, mode: "insensitive" as const } : undefined,
    gender: genderFilter,
    chapterId: chapterFilter,
    ...(divisionFilter
      ? {
          gender: divisionFilter.gender as "MALE" | "FEMALE",
          birthYear: {
            gte: divisionFilter.birthYearMin,
            lte: divisionFilter.birthYearMax,
          },
          entries: {
            some: { teamRegistration: { eventId: divisionFilter.eventId } },
          },
        }
      : {}),
  };

  const requestedPage = parsePage(pageParam);
  const [athletes, totalAthletes] = await Promise.all([
    db.athlete.findMany({
      where: athletesWhere,
      include: { chapter: true },
      orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.athlete.count({ where: athletesWhere }),
  ]);
  const totalPages = pageCount(totalAthletes);
  const athletesPage = clampPage(requestedPage, totalPages);

  const byChapter = new Map<string, (typeof athletes)[number][]>();
  for (const athlete of athletes) {
    const list = byChapter.get(athlete.chapterId) ?? [];
    list.push(athlete);
    byChapter.set(athlete.chapterId, list);
  }
  const groups = [...byChapter.entries()];
  const hasFilters =
    query !== "" ||
    genderFilter !== undefined ||
    chapterFilter !== undefined ||
    divisionFilter !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Athletes</h1>
        <p className="text-sm text-muted-foreground">
          All registered athletes across chapters. Click an athlete for their
          tournament and payment details.
        </p>
      </div>

      <form
        method="get"
        action="/admin/athletes"
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Athlete name"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="gender" className="text-xs font-medium text-muted-foreground">
            Gender
          </label>
          <select id="gender" name="gender" defaultValue={genderFilter ?? ""} className={selectClass}>
            <option value="">All genders</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="chapter" className="text-xs font-medium text-muted-foreground">
            Chapter
          </label>
          <select id="chapter" name="chapter" defaultValue={chapterFilter ?? ""} className={selectClass}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="division" className="text-xs font-medium text-muted-foreground">
            Division
          </label>
          <select id="division" name="division" defaultValue={divisionId ?? ""} className={selectClass}>
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.event.name} — {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" className="w-full">
            Filter
          </Button>
          {hasFilters ? (
            <Button render={<Link href="/admin/athletes" />} variant="outline" size="sm">
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      {athletes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            {hasFilters ? "No athletes match those filters." : "No athletes registered yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">
            {totalAthletes} athlete{totalAthletes === 1 ? "" : "s"}
            {query ? ` matching “${query}”` : ""}
          </p>
          {groups.map(([chapterId, rows]) => (
            <section key={chapterId} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {rows[0].chapter.name} · {rows.length}
              </h2>
              <ul className="overflow-hidden rounded-lg border bg-card">
                {rows.map((athlete) => (
                  <li key={athlete.id} className="border-b last:border-b-0">
                    <Link
                      href={`/admin/athletes/${athlete.id}`}
                      className="group flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{athlete.name}</span>
                        <Badge variant="secondary">
                          {genderLabel(athlete.gender as Gender)}
                        </Badge>
                        {athlete.beltType ? (
                          <Badge variant="outline">{beltLabel(athlete.beltType)}</Badge>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {athlete.birthYear}
                          {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                        </span>
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Pagination
            page={athletesPage}
            totalPages={totalPages}
            buildHref={(page) =>
              pageHref({ q: q ?? "", gender, chapter, division }, "page", page)
            }
          />
        </div>
      )}
    </div>
  );
}