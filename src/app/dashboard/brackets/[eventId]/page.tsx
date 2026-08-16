import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Search, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/events";
import { championsOf } from "@/lib/brackets";
import { getBracketCells, getPublishedEvent } from "@/lib/brackets-queries";

export const metadata = { title: "Brackets & Schedule" };

type StatusFilter = "all" | "finished" | "in_progress";

const STATUS_LABELS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "finished", label: "Champion decided" },
  { value: "in_progress", label: "In progress" },
];

export default async function BracketsCoachEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole("coach");

  const { eventId } = await params;
  const { q, status } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const statusFilter: StatusFilter =
    status === "finished" || status === "in_progress" ? status : "all";

  const event = await getPublishedEvent(eventId);
  if (!event) notFound();

  const divisionIds = event.divisions.map((d) => d.id);
  const cells = await getBracketCells(divisionIds);

  const cellsByDivision = new Map<string, (typeof cells)[number][]>();
  for (const cell of cells) {
    const list = cellsByDivision.get(cell.divisionId) ?? [];
    list.push(cell);
    cellsByDivision.set(cell.divisionId, list);
  }

  const allBrackets = event.divisions.flatMap((division) => {
      const divisionCells = cellsByDivision.get(division.id) ?? [];
      if (divisionCells.length === 0) return [];
      const names = namesFor(divisionCells);
      const champions = championsOf(divisionCells);
      const championName = champions ? names[champions.winnerId] ?? null : null;
      return [{ division, cells: divisionCells, championName }];
    });

  const brackets = allBrackets.filter(({ division, championName }) => {
      const matchesQuery =
        !query ||
        division.name.toLowerCase().includes(query) ||
        (championName?.toLowerCase().includes(query) ?? false);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "finished" ? championName !== null : championName === null);
      return matchesQuery && matchesStatus;
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {formatDate(event.eventDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="text-emerald-600">Verified</span> = registration approved ·{" "}
            <span className="text-amber-600">Pending</span> = not approved yet
          </p>
        </div>
        <Button render={<Link href="/dashboard/brackets" />} variant="outline">
          <ArrowLeft />
          Back
        </Button>
      </div>

      {allBrackets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Trophy className="size-8" />
            Brackets coming soon. Check back once the organizer publishes draws.
          </CardContent>
        </Card>
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search brackets..."
                  className="h-8 pl-8"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {STATUS_LABELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              Filter
            </Button>
            {query || statusFilter !== "all" ? (
              <Button
                render={<Link href={`/dashboard/brackets/${event.id}`} />}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            ) : null}
          </form>

          {brackets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No brackets match your filters.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y">
                {brackets.map(({ division, championName }) => (
                  <li key={division.id}>
                    <Link
                      href={`/dashboard/brackets/${event.id}/${division.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <span className="block truncate font-medium">{division.name}</span>
                        {championName ? (
                          <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                            <Trophy className="size-3.5" />
                            {championName}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">In progress</span>
                        )}
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function namesFor(
  cells: { athleteId?: string | null; athlete?: { id: string; name: string } | null }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cell of cells) {
    if (cell.athleteId && cell.athlete) map[cell.athleteId] = cell.athlete.name;
  }
  return map;
}