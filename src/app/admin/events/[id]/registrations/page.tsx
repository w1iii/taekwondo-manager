import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/events";
import { ChapterCard } from "./chapter-card";

export const metadata = { title: "Event registrations" };

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("organizer");

  const { id } = await params;
  const event = await db.event.findFirst({ where: { id } });
  if (!event) notFound();

  const orders = await db.order.findMany({
    where: { eventId: id },
    include: {
      chapter: true,
      items: {
        include: { athlete: true },
        orderBy: { athlete: { name: "asc" } },
      },
      payments: { orderBy: { submittedAt: "desc" } },
    },
    orderBy: { chapter: { name: "asc" } },
  });

  const approvedAthletes = await db.approvedAthlete.findMany({
    where: { eventId: id },
    include: { athlete: true },
    orderBy: { approvedAt: "asc" },
  });

  const orderItemDivisions = await db.orderItemDivision.findMany({
    where: { orderItem: { is: { order: { is: { eventId: id } } } } },
    select: { orderItemId: true, division: { select: { name: true } } },
  });
  const divisionsByItem: Record<string, string[]> = {};
  for (const d of orderItemDivisions) {
    (divisionsByItem[d.orderItemId] ??= []).push(d.division.name);
  }

  const approvedDivisions = await db.approvedAthleteDivision.findMany({
    where: { approvedAthlete: { is: { eventId: id } } },
    select: {
      approvedAthlete: { select: { athleteId: true } },
      division: { select: { name: true } },
    },
  });
  const divisionsByAthlete: Record<string, string[]> = {};
  for (const d of approvedDivisions) {
    (divisionsByAthlete[d.approvedAthlete.athleteId] ??= []).push(d.division.name);
  }

  const totalApproved = approvedAthletes.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.eventDate)} · {event.location} ·{" "}
            {totalApproved} approved athlete{totalApproved === 1 ? "" : "s"} across{" "}
            {orders.length} chapter{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/admin/events" />} variant="outline">
          <ArrowLeft />
          Back to events
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            No registrations for this event yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <ChapterCard
              key={order.id}
              chapter={order.chapter}
              order={order}
              approvedAthletes={approvedAthletes.filter((a) => a.chapterId === order.chapterId)}
              divisionsByItem={divisionsByItem}
              divisionsByAthlete={divisionsByAthlete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
