import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import {
  formatDate,
  formatDeadline,
  formatPesos,
  isRegistrationOpen,
} from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";
import { registerAthletes } from "../actions";
import { EnrollForm } from "./enroll-form";

export const metadata = { title: "Register for event" };

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("coach");

  const { id } = await params;
  const chapter = await getChapterForUser(user);

  const event = await db.event.findFirst({
    where: { id, status: EventStatus.PUBLISHED },
  });
  if (!event) notFound();

  const order = chapter
    ? await db.order.findFirst({
        where: {
          eventId: id,
          chapterId: chapter.id,
          status: { in: ["PENDING", "PAID"] },
        },
        include: {
          items: {
            include: { athlete: true },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const approvedAthletes = chapter
    ? await db.approvedAthlete.findMany({
        where: { eventId: id, chapterId: chapter.id },
        include: { athlete: true },
        orderBy: { approvedAt: "asc" },
      })
    : [];

  const registeredIds = new Set([
    ...order?.items.map((i) => i.athleteId) ?? [],
    ...approvedAthletes.map((a) => a.athleteId),
  ]);

  const eligible = chapter
    ? await db.athlete.findMany({
        where: { chapterId: chapter.id, id: { notIn: [...registeredIds] } },
        orderBy: { name: "asc" },
      })
    : [];

  const open = isRegistrationOpen(event.registrationDeadline);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">Register your athletes</p>
        </div>
        <Button render={<Link href="/dashboard/events" />} variant="outline">
          Back to events
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-1 text-sm">
          {event.imageUrl ? (
            <div className="relative mb-2 h-48 w-full rounded-lg border bg-muted/40">
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                sizes="(min-width: 768px) 672px, 100vw"
                className="rounded-lg object-cover"
              />
            </div>
          ) : null}
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
          <p className="text-xs text-muted-foreground">
            Registration closes {formatDeadline(event.registrationDeadline)}
          </p>
          {event.description ? (
            <p className="pt-2 text-muted-foreground">{event.description}</p>
          ) : null}
          <p className="pt-2">
            {open ? (
              <Badge>Registration open</Badge>
            ) : (
              <Badge variant="secondary">Registration closed</Badge>
            )}
          </p>
        </CardContent>
      </Card>

      {order && order.items.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending order · {order.items.length} athlete{order.items.length === 1 ? "" : "s"}
          </h2>
          <Card>
            <CardContent>
              <ul className="space-y-2">
                {order.items.map(({ id: itemId, athlete }) => (
                  <li
                    key={itemId}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{athlete.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {athlete.gender === "MALE" ? "Male" : "Female"} · born{" "}
                        {athlete.birthYear}
                      </span>
                    </span>
                    <Badge variant="secondary">In order</Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Button render={<Link href="/dashboard/payments" />} size="sm">
                  Go to payments
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {approvedAthletes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Approved · {approvedAthletes.length}
          </h2>
          <Card>
            <CardContent>
              <ul className="space-y-2">
                {approvedAthletes.map(({ athlete }) => (
                  <li
                    key={athlete.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <span className="font-medium">{athlete.name}</span>
                    <span className="text-muted-foreground">
                      {athlete.gender === "MALE" ? "Male" : "Female"} · born{" "}
                      {athlete.birthYear}
                    </span>
                    <Badge variant="default" className="ml-auto">Approved</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {open && eligible.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Add more athletes
          </h2>
          <Card>
            <CardContent>
              <EnrollForm
                eventId={event.id}
                fee={event.entryFeePesos}
                athletes={eligible}
                action={registerAthletes}
              />
            </CardContent>
          </Card>
        </section>
      ) : open && eligible.length === 0 && (order || approvedAthletes.length > 0) ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            All athletes on your roster are registered for this event.
          </CardContent>
        </Card>
      ) : !open ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Registration has closed for this event.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
