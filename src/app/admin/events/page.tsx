import Link from "next/link";
import { CalendarPlus, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDeadline, formatPesos, isEventUpcoming } from "@/lib/events";
import { EventStatus, type Event } from "@/generated/prisma/client";
import { EventActions } from "./event-actions";

export const metadata = { title: "Events" };

function statusBadge(status: EventStatus) {
  return (
    <Badge variant={status === EventStatus.PUBLISHED ? "default" : "secondary"}>
      {status === EventStatus.PUBLISHED ? "Published" : "Draft"}
    </Badge>
  );
}

function EventCard({ event }: { event: Event & { _count: { enrollments: number } } }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{event.name}</h2>
            {statusBadge(event.status)}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {event.location}
            </span>
            <span>{formatDate(event.eventDate)}</span>
            <span>{formatPesos(event.entryFeePesos)} / athlete</span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Registration closes {formatDeadline(event.registrationDeadline)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {event._count.enrollments} athlete
            {event._count.enrollments === 1 ? "" : "s"} registered
          </p>
          {event.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {event.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button
            render={<Link href={`/admin/events/${event.id}/registrations`} />}
            variant="outline"
            size="sm"
          >
            <Users />
            Registrations ({event._count.enrollments})
          </Button>
          <EventActions id={event.id} status={event.status} />
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {count}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default async function EventsAdminPage() {
  await requireRole("organizer");

  const events = await db.event.findMany({
    orderBy: { eventDate: "desc" },
    include: { _count: { select: { enrollments: true } } },
  });

  const published = events.filter((e) => e.status === EventStatus.PUBLISHED);
  const drafts = events.filter((e) => e.status === EventStatus.DRAFT);

  const upcoming = [...published]
    .filter((e) => isEventUpcoming(e.eventDate))
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  const past = [...published]
    .filter((e) => !isEventUpcoming(e.eventDate))
    .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Set up tournaments, set fees, and publish them so coaches can register.
          </p>
        </div>
        <Button render={<Link href="/admin/events/new" />}>
          <CalendarPlus />
          New event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No events yet. Create your first tournament.
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Section>
          ) : null}

          {drafts.length > 0 ? (
            <Section title="Drafts" count={drafts.length}>
              {drafts.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Section>
          ) : null}

          {past.length > 0 ? (
            <Section title="Past" count={past.length}>
              {past.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}