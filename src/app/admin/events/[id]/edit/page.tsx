import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateEvent } from "../../actions";
import { EventForm } from "../../event-form";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("organizer");

  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit event</h1>
        <p className="text-sm text-muted-foreground">{event.name}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/admin/events" />}>
          ← Back to events
        </Button>
      </div>

      <EventForm
        action={updateEvent}
        values={{
          id: event.id,
          name: event.name,
          description: event.description,
          location: event.location,
          imageUrl: event.imageUrl,
          eventDate: event.eventDate,
          registrationDeadline: event.registrationDeadline,
          entryFeePesos: event.entryFeePesos,
        }}
      />
    </div>
  );
}
