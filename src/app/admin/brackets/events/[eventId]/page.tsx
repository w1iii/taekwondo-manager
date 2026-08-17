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
import { beltLabel, genderLabel } from "@/lib/athletes";
import { EventStatus } from "@/generated/prisma/client";
import { pageCount, clampPage, parsePage, toSearchParams } from "@/lib/pagination";

export const metadata = { title: "Event brackets" };

const PLAYERS_PAGE_SIZE = 10;

const BELT_OPTIONS = [
  { value: "WHITE", label: "White" },
  { value: "YELLOW", label: "Yellow" },
  { value: "GREEN", label: "Green" },
  { value: "BLUE", label: "Blue" },
  { value: "RED", label: "Red" },
  { value: "BLACK", label: "Black" },
];

export default async function AdminEventBracketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ q?: string; gender?: string; belt?: string; page?: string }>;
}) {
  await requireRole("organizer");

  const { eventId } = await params;
  const { q, gender, belt, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const requestedPage = parsePage(pageParam);

  const event = await db.event.findUnique({
    where: { id: eventId, status: EventStatus.PUBLISHED },
    include: {
      divisions: { include: { weightClass: true } },
    },
  });
  if (!event) notFound();

  const entries = await db.approvedAthlete.findMany({
    where: {
      eventId,
    },
    include: { athlete: true },
  });

  const approvedDivisions = await db.approvedAthleteDivision.findMany({
    where: { divisionId: { in: event.divisions.map((d) => d.id) } },
    select: {
      division: { select: { name: true } },
      approvedAthlete: { select: { athleteId: true } },
    },
  });
  const divisionsByAthlete = new Map<string, string[]>();
  for (const ad of approvedDivisions) {
    const list = divisionsByAthlete.get(ad.approvedAthlete.athleteId) ?? [];
    list.push(ad.division.name);
    divisionsByAthlete.set(ad.approvedAthlete.athleteId, list);
  }

  const allAthletes = entries.map((e) => e.athlete);

  let filtered = allAthletes;

  if (query) {
    filtered = filtered.filter((a) =>
      a.name.toLowerCase().includes(query.toLowerCase()),
    );
  }

  if (gender) {
    filtered = filtered.filter((a) => a.gender === gender);
  }

  if (belt) {
    filtered = filtered.filter((a) => a.beltType === belt);
  }

  const totalPlayers = filtered.length;
  const totalPages = pageCount(totalPlayers, PLAYERS_PAGE_SIZE);
  const currentPage = clampPage(requestedPage, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PLAYERS_PAGE_SIZE,
    currentPage * PLAYERS_PAGE_SIZE,
  );

  const buildFilterHref = (overrides: Record<string, string | undefined>) => {
    const params = toSearchParams({
      q: query || undefined,
      gender: gender || undefined,
      belt: belt || undefined,
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
            {formatDate(event.eventDate)} · {allAthletes.length} athlete
            {allAthletes.length === 1 ? "" : "s"} · {event.divisions.length} division
            {event.divisions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/admin/brackets" />} variant="outline">
          <ArrowLeft />
          Back
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="size-4" />
          Players · {totalPlayers}
        </h2>

        {allAthletes.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              No players registered for this event yet.
            </CardContent>
          </Card>
        ) : (
          <>
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
                    placeholder="Search players..."
                    className="h-8 pl-8"
                  />
                </div>
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
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Belt
                </label>
                <select
                  name="belt"
                  defaultValue={belt ?? ""}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">All belts</option>
                  {BELT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm">
                Filter
              </Button>
              {(query || gender || belt) ? (
                <Button render={<Link href={`/admin/brackets/events/${event.id}`} />} variant="outline" size="sm">
                  Clear
                </Button>
              ) : null}
            </form>

            {paginated.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Users className="size-8" />
                  No players match your filters.
                </CardContent>
              </Card>
            ) : (
              <>
                <ul className="overflow-hidden rounded-lg border bg-card">
                  {paginated.map((athlete) => (
                    <li
                      key={athlete.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium">{athlete.name}</span>
                        <Badge variant="secondary">{genderLabel(athlete.gender)}</Badge>
                        {athlete.beltType ? (
                          <Badge variant="outline">{beltLabel(athlete.beltType)}</Badge>
                        ) : null}
                      </span>
                      <span className="min-w-0 text-right text-xs text-muted-foreground">
                        {divisionsByAthlete.get(athlete.id)?.join(", ") ?? "No division"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {athlete.birthYear}
                        {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  buildHref={(page) =>
                    buildFilterHref({ page: page <= 1 ? undefined : String(page) })
                  }
                />
              </>
            )}
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="size-4" />
          Divisions · {event.divisions.length}
        </h2>
        {event.divisions.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              No divisions yet — they appear here once players register into them.
            </CardContent>
          </Card>
        ) : (
          <Button render={<Link href={`/admin/brackets/events/${event.id}/divisions`} />}>
            View Divisions
          </Button>
        )}
      </section>
    </div>
  );
}
