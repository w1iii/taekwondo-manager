import Link from "next/link";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import {
  pageCount,
  pageHref,
  clampPage,
  parsePage,
} from "@/lib/pagination";
import { AddAthleteForm } from "./add-athlete-form";
import { AthleteRow } from "./athlete-row";
import { createAthlete, deleteAthlete, updateAthlete } from "./actions";

export const metadata = { title: "My Roster" };

const ROSTER_PAGE_SIZE = 5;

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireRole("coach");

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My Roster</h1>
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Link your chapter before managing a roster. Register your chapter on
            the public site, then wait for approval.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const requestedPage = parsePage(pageParam);

  const where = {
    chapterId: chapter.id,
    name: query ? { contains: query, mode: "insensitive" as const } : undefined,
  };

  const [athletes, totalAthletes] = await Promise.all([
    db.athlete.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (requestedPage - 1) * ROSTER_PAGE_SIZE,
      take: ROSTER_PAGE_SIZE,
    }),
    db.athlete.count({ where }),
  ]);
  const totalPages = pageCount(totalAthletes, ROSTER_PAGE_SIZE);
  const athletesPage = clampPage(requestedPage, totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Roster</h1>
        <p className="text-sm text-muted-foreground">
          {chapter.name} · {totalAthletes} athlete
          {totalAthletes === 1 ? "" : "s"} on file
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Add athlete
        </h2>
        <Card>
          <CardContent>
            <AddAthleteForm action={createAthlete} />
          </CardContent>
        </Card>
      </section>

      <form
        method="get"
        action="/dashboard/roster"
        className="flex items-center gap-2"
      >
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search athletes by name"
          className="h-8"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
        {query ? (
          <Button render={<Link href="/dashboard/roster" />} variant="outline" size="sm">
            Clear
          </Button>
        ) : null}
      </form>

      {athletes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            {query
              ? `No athletes match “${query}”.`
              : "No athletes yet. Add your first athlete to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {query ? (
            <p className="text-sm text-muted-foreground">
              {totalAthletes} athlete{totalAthletes === 1 ? "" : "s"} matching
              “{query}”
            </p>
          ) : null}
          <ul className="space-y-2">
            {athletes.map((athlete) => (
              <AthleteRow
                key={athlete.id}
                athlete={athlete}
                updateAction={updateAthlete}
                deleteAction={deleteAthlete}
              />
            ))}
          </ul>
        </div>
      )}

      <Pagination
        page={athletesPage}
        totalPages={totalPages}
        buildHref={(page) => pageHref({ q: query || undefined }, "page", page)}
      />
    </div>
  );
}