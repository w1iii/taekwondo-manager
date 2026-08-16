import Link from "next/link";
import { CalendarDays, Search, Trophy, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/events";
import { parsePage, clampPage, pageCount, toSearchParams } from "@/lib/pagination";
import { getBracketCells, getPublishedEvents } from "@/lib/brackets-queries";

export const metadata = { title: "Brackets & Schedule" };

const PAGE_SIZE = 20;

export default async function BracketsCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRole("coach");

  const { q, page: pageParam } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const requestedPage = parsePage(pageParam);

  const events = await getPublishedEvents();
  const divisionIds = events.flatMap((e) => e.divisions.map((d) => d.id));
  const cells = await getBracketCells(divisionIds);

  const cellsByDivision = new Map<string, number>();
  for (const cell of cells) {
    cellsByDivision.set(cell.divisionId, (cellsByDivision.get(cell.divisionId) ?? 0) + 1);
  }

  const withBrackets = events
    .map((event) => ({
      event,
      bracketCount: event.divisions.filter(
        (d) => (cellsByDivision.get(d.id) ?? 0) > 0,
      ).length,
    }))
    .filter((e) => e.bracketCount > 0);

  const filtered = withBrackets.filter(({ event, bracketCount }) => {
    if (!query) return true;
    return (
      event.name.toLowerCase().includes(query) ||
      event.divisions.some((d) => d.name.toLowerCase().includes(query)) ||
      String(bracketCount).includes(query)
    );
  });

  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const currentPage = clampPage(requestedPage, totalPages);
  const pageEvents = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = toSearchParams({
      q: query || undefined,
      page: currentPage > 1 ? String(currentPage) : undefined,
      ...overrides,
    });
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brackets & Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Pick an event to view its brackets & schedule.
          </p>
        </div>
        <form method="get" className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search events..."
            className="h-8 w-64 pl-8"
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Trophy className="size-8" />
            {withBrackets.length === 0
              ? "Brackets coming soon. Check back once the organizer publishes draws."
              : "No events match your search."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageEvents.map(({ event, bracketCount }) => (
              <Card key={event.id}>
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-medium">{event.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDate(event.eventDate)}
                    </p>
                  </div>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3.5" />
                    {bracketCount} bracket{bracketCount === 1 ? "" : "s"}
                  </p>
                  <div className="mt-auto">
                    <Button
                      render={<Link href={`/dashboard/brackets/${event.id}`} />}
                      className="w-full"
                    >
                      View brackets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length > PAGE_SIZE && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              buildHref={(page) =>
                buildHref({ page: page <= 1 ? undefined : String(page) })
              }
            />
          )}
        </>
      )}
    </div>
  );
}