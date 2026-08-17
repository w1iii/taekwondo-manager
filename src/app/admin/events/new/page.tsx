import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidateDivisionsForEvent } from "@/lib/divisions";
import { createEvent } from "../actions";
import { EventForm } from "../event-form";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireRole("organizer");

  const weightClasses = await db.weightClass.findMany({
    orderBy: [{ gender: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New event</h1>
        <p className="text-sm text-muted-foreground">
          Drafts stay hidden from coaches until you publish them.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/admin/events" />}>
          ← Back to events
        </Button>
      </div>

      <EventForm
        action={createEvent}
        candidateDivisions={candidateDivisionsForEvent(weightClasses)}
      />
    </div>
  );
}
