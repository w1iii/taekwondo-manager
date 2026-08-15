import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { athletesInDivision, EVENT_TYPE_LABELS } from "@/lib/divisions";
import { beltLabel, genderLabel } from "@/lib/athletes";
import { EventStatus, type Division } from "@/generated/prisma/client";
import { ActionButton } from "@/components/action-button";
import { generateDivisions } from "../../actions";

export const metadata = { title: "Event brackets" };

type DivisionRow = Division & { weightClass: { minKg: number | null; maxKg: number | null } | null };

function weightLabel(division: DivisionRow): string {
  const wc = division.weightClass;
  if (!wc) return "—";
  if (wc.maxKg != null) return `≤ ${wc.maxKg} kg`;
  if (wc.minKg != null) return `> ${wc.minKg} kg`;
  return "—";
}

export default async function AdminEventBracketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireRole("organizer");

  const { eventId } = await params;
  const event = await db.event.findUnique({
    where: { id: eventId, status: EventStatus.PUBLISHED },
    include: {
      divisions: { include: { weightClass: true } },
      enrollments: { include: { athlete: true } },
    },
  });
  if (!event) notFound();

  const year = event.eventDate.getFullYear();
  const enrollments = event.enrollments.map((e) => e.athlete);
  const divisionIds = event.divisions.map((d) => d.id);
  const cellCounts = await db.bracketCell.groupBy({
    by: ["divisionId"],
    where: { divisionId: { in: divisionIds } },
    _count: { _all: true },
  });
  const cellCountByDivision = new Map(
    cellCounts.map((c) => [c.divisionId, c._count._all]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline size-3.5" />
            {formatDate(event.eventDate)} · {enrollments.length} athlete
            {enrollments.length === 1 ? "" : "s"} · {event.divisions.length} division
            {event.divisions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/admin/brackets" />} variant="outline">
          <ArrowLeft />
          Back
        </Button>
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
            {(Object.keys(EVENT_TYPE_LABELS) as (keyof typeof EVENT_TYPE_LABELS)[]).map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name={`eventType:${t}`}
                  defaultChecked={t === "KYORUGI" || t === "POOMSAE"}
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

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="size-4" />
          Players · {enrollments.length}
        </h2>
        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              No players registered for this event yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="overflow-hidden rounded-lg border bg-card">
            {enrollments.map((athlete) => (
              <li
                key={athlete.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{athlete.name}</span>
                  <Badge variant="secondary">{genderLabel(athlete.gender)}</Badge>
                  {athlete.beltType ? (
                    <Badge variant="outline">{beltLabel(athlete.beltType)}</Badge>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">
                  {athlete.birthYear}
                  {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                </span>
              </li>
            ))}
          </ul>
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
              No divisions yet — generate them from current registrations above.
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
                enrollments,
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
                      View bracket
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}