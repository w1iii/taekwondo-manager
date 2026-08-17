import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Search, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { EVENT_TYPE_LABELS } from "@/lib/divisions";
import { beltLabel, genderLabel } from "@/lib/athletes";
import { EventStatus } from "@/generated/prisma/client";
import { ActionButton } from "@/components/action-button";
import { generateBracket } from "../../../actions";
import { pageCount, clampPage, parsePage, toSearchParams } from "@/lib/pagination";

export const metadata = { title: "Event divisions" };

const DIVISIONS_PAGE_SIZE = 10;

export default async function DivisionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ q?: string; type?: string; gender?: string; page?: string }>;
}) {
  await requireRole("organizer");

  const { eventId } = await params;
  const { q, type, gender, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const requestedPage = parsePage(pageParam);

  const event = await db.event.findUnique({
    where: { id: eventId, status: EventStatus.PUBLISHED },
    include: {
      divisions: { include: { weightClass: true } },
    },
  });
  if (!event) notFound();

  const divisionIds = event.divisions.map((d) => d.id);
  const [cellCounts, memberCounts] = await Promise.all([
    db.bracketCell.groupBy({
      by: ["divisionId"],
      where: { divisionId: { in: divisionIds } },
      _count: { _all: true },
    }),
    db.approvedAthleteDivision.groupBy({
      by: ["divisionId"],
      where: { divisionId: { in: divisionIds } },
      _count: { _all: true },
    }),
  ]);
  const cellCountByDivision = new Map(
    cellCounts.map((c) => [c.divisionId, c._count._all]),
  );
  const memberCountByDivision = new Map(
    memberCounts.map((c) => [c.divisionId, c._count._all]),
  );

  let filtered = event.divisions;

  if (query) {
    filtered = filtered.filter((d) =>
      d.name.toLowerCase().includes(query.toLowerCase()),
    );
  }

  if (type) {
    filtered = filtered.filter((d) => d.eventType === type);
  }

  if (gender) {
    filtered = filtered.filter((d) => d.gender === gender);
  }

  const totalDivisions = filtered.length;
  const totalPages = pageCount(totalDivisions, DIVISIONS_PAGE_SIZE);
  const currentPage = clampPage(requestedPage, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * DIVISIONS_PAGE_SIZE,
    currentPage * DIVISIONS_PAGE_SIZE,
  );

  const buildFilterHref = (overrides: Record<string, string | undefined>) => {
    const params = toSearchParams({
      q: query || undefined,
      type: type || undefined,
      gender: gender || undefined,
      ...overrides,
    });
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline size-3.5" />
            {formatDate(event.eventDate)} · {event.divisions.length} division
            {event.divisions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href={`/admin/brackets/events/${event.id}`} />} variant="outline">
          <ArrowLeft />
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Divisions appear here automatically once players register into them.
          Draw a bracket for each division that has players.
        </CardContent>
      </Card>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search divisions..."
              className="h-8 pl-8"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Event Type
          </label>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All types</option>
            {(Object.keys(EVENT_TYPE_LABELS) as (keyof typeof EVENT_TYPE_LABELS)[]).map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Gender
          </label>
          <select
            name="gender"
            defaultValue={gender ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <Button type="submit" size="sm">
          Filter
        </Button>
        {(query || type || gender) ? (
          <Button render={<Link href={`/admin/brackets/events/${event.id}/divisions`} />} variant="outline" size="sm">
            Clear
          </Button>
        ) : null}
      </form>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="size-4" />
          Divisions · {totalDivisions}
        </h2>
        {paginated.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <Users className="size-8" />
              {query || type || gender
                ? "No divisions match your filters."
                : "No divisions yet — they appear here once players register."}
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((division) => {
              const count = memberCountByDivision.get(division.id) ?? 0;
              const hasBracket = (cellCountByDivision.get(division.id) ?? 0) > 0;
              return (
                <li key={division.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{division.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {count}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {EVENT_TYPE_LABELS[division.eventType]} ·{" "}
                    {genderLabel(division.gender)} ·{" "}
                    {division.minAge != null ? division.minAge : "?"}–
                    {division.maxAge != null ? division.maxAge : "+"} ·{" "}
                    {division.beltType ? beltLabel(division.beltType) : "No belt"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {count === 0 ? (
                      <Badge variant="secondary">No players</Badge>
                    ) : hasBracket ? (
                      <Badge variant="secondary">Bracket ready</Badge>
                    ) : null}
                    {count > 0 && !hasBracket ? (
                      <form action={generateBracket}>
                        <input type="hidden" name="divisionId" value={division.id} />
                        <ActionButton label="Generate bracket" size="sm" />
                      </form>
                    ) : null}
                    <Button
                      render={<Link href={`/admin/brackets/${division.id}`} />}
                      size="sm"
                      disabled={!hasBracket}
                    >
                      View bracket
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          buildHref={(page) =>
            buildFilterHref({ page: page <= 1 ? undefined : String(page) })
          }
        />
      </section>
    </div>
  );
}