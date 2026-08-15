import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/events";
import { getBracketCells, getPublishedEvents } from "@/lib/brackets-queries";

export const metadata = { title: "Brackets & Schedule" };

export default async function BracketsCoachPage() {
  await requireRole("coach");

  const events = await getPublishedEvents();
  const divisionIds = events.flatMap((e) => e.divisions.map((d) => d.id));
  const cells = await getBracketCells(divisionIds);

  const cellsByDivision = new Map<string, number>();
  for (const cell of cells) {
    cellsByDivision.set(cell.divisionId, (cellsByDivision.get(cell.divisionId) ?? 0) + 1);
  }

  const ready = events
    .map((event) => ({
      event,
      divisionCount: event.divisions.filter((d) => (cellsByDivision.get(d.id) ?? 0) > 0).length,
    }))
    .filter((e) => e.divisionCount > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brackets & Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Published tournament brackets, separated by event.
        </p>
      </div>

      {ready.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Trophy className="size-8" />
            Brackets coming soon. Check back once the organizer publishes draws.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ready.map(({ event, divisionCount }) => (
            <Card key={event.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-base font-medium">{event.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    <CalendarDays className="mr-1 inline size-3.5" />
                    {formatDate(event.eventDate)} · {divisionCount} division
                    {divisionCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button render={<Link href={`/dashboard/brackets/${event.id}`} />}>
                  View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}