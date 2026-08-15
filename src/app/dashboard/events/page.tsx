import Link from "next/link";
import { CalendarDays, MapPin, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import {
  formatDate,
  formatDeadline,
  formatPesos,
  isEventUpcoming,
  isRegistrationOpen,
} from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";
import { unstable_cache } from "next/cache";

export const metadata = { title: "Events" };

async function getPublishedEvents() {
  return db.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    orderBy: { eventDate: "asc" },
  });
}

const getCachedPublishedEvents = unstable_cache(getPublishedEvents, ["published-events"], {
  tags: ["events-published"],
});

export default async function EventsCoachPage() {
  const user = await requireRole("coach");

  const chapter = await getChapterForUser(user);

  const events = await getCachedPublishedEvents();

  const upcoming = events.filter((e) => isEventUpcoming(e.eventDate));

  const enrolledByEvent = chapter
    ? await db.enrollment.groupBy({
        by: ["eventId"],
        where: { chapterId: chapter.id },
        _count: { _all: true },
      })
    : [];

  const enrolledMap = new Map(
    enrolledByEvent.map((g) => [g.eventId, g._count._all]),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Published tournaments you can register your chapter for.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No upcoming events right now. Check back closer to the next
            tournament.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {upcoming.map((event) => (
            <li key={event.id} className="overflow-hidden rounded-lg border bg-card">
              {event.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local uploads need the session cookie
                <img
                  src={event.imageUrl}
                  alt={event.name}
                  className="h-28 w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                <p className="font-medium">{event.name}</p>
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-4" />
                    {formatDate(event.eventDate)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {event.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <Tag className="size-4" />
                    {formatPesos(event.entryFeePesos)} per athlete
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Registration closes {formatDeadline(event.registrationDeadline)}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {enrolledMap.get(event.id) ?? 0} registered from your chapter
                  </p>
                  {isRegistrationOpen(event.registrationDeadline) ? (
                    <Button
                      render={<Link href={`/dashboard/events/${event.id}`} />}
                      size="sm"
                    >
                      Register
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Registration closed</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
