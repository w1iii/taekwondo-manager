import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { athletesInDivision, EVENT_TYPE_LABELS } from "@/lib/divisions";
import {
  BeltType,
  EventStatus,
  EventType,
  type Event,
  type Division,
} from "@/generated/prisma/client";
import { ActionButton } from "@/components/action-button";
import { generateDivisions } from "./actions";

export const metadata = { title: "Brackets" };

type AthleteRow = {
  id: string;
  gender: "MALE" | "FEMALE";
  birthYear: number;
  weightKg: number;
  beltType: BeltType | null;
};

type DivisionRow = Division & { weightClass: { minKg: number | null; maxKg: number | null } | null };

export default async function BracketsAdminPage() {
  await requireRole("organizer");

  const events = await db.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    include: {
      divisions: { include: { weightClass: true } },
      enrollments: { include: { athlete: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  const divisionIds = events.flatMap((e) => e.divisions.map((d) => d.id));
  const cellCounts = await db.bracketCell.groupBy({
    by: ["divisionId"],
    where: { divisionId: { in: divisionIds } },
    _count: { _all: true },
  });
  const cellCountByDivision = new Map(
    cellCounts.map((c) => [c.divisionId, c._count._all]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brackets</h1>
        <p className="text-sm text-muted-foreground">
          Generate divisions from registrations (WT age groups, weight classes
          and belt ranks), then build single-elimination brackets for each.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Publish an event with registrations to start building brackets.
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <EventSection
            key={event.id}
            event={event}
            cellCountByDivision={cellCountByDivision}
          />
        ))
      )}
    </div>
  );
}

function weightLabel(division: DivisionRow): string {
  const wc = division.weightClass;
  if (!wc) return "—";
  if (wc.maxKg != null) return `≤ ${wc.maxKg} kg`;
  if (wc.minKg != null) return `> ${wc.minKg} kg`;
  return "—";
}

function EventSection({
  event,
  cellCountByDivision,
}: {
  event: Event & { divisions: DivisionRow[]; enrollments: { athlete: AthleteRow }[] };
  cellCountByDivision: Map<string, number>;
}) {
  const year = event.eventDate.getFullYear();
  const athletes = event.enrollments.map((e) => e.athlete);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-medium">{event.name}</h2>
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline size-3.5" />
            {formatDate(event.eventDate)} · {athletes.length} athlete
            {athletes.length === 1 ? "" : "s"}
          </p>
        </div>
        <form
          action={generateDivisions}
          className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-3"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Event types
            </p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name={`eventType:${t}`}
                    defaultChecked={t === EventType.KYORUGI || t === EventType.POOMSAE}
                  />
                  {EVENT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>
          <input type="hidden" name="eventId" value={event.id} />
          <ActionButton
            label={event.divisions.length > 0 ? "Regenerate divisions" : "Generate divisions"}
            variant="outline"
          />
        </form>
      </div>

      {event.divisions.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No divisions yet — generate them from current registrations.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {event.divisions.map((division) => {
            const count = athletesInDivision(
              {
                gender: division.gender,
                eventType: division.eventType,
                minAge: division.minAge,
                maxAge: division.maxAge,
                beltType: division.beltType,
                weightClass: division.weightClass,
              },
              year,
              athletes,
            ).length;
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
                  {division.minAge != null ? division.minAge : "?"}–
                  {division.maxAge != null ? division.maxAge : "+"} ·{" "}
                  {weightLabel(division)} ·{" "}
                  {division.beltType ? `Belt ${division.beltType}` : "No belt"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {hasBracket ? (
                    <Badge variant="secondary">Bracket ready</Badge>
                  ) : null}
                  <Button
                    render={<Link href={`/admin/brackets/${division.id}`} />}
                    size="sm"
                  >
                    View
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}