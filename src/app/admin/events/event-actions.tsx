"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteEvent, setEventStatus } from "./actions";

type EventStatus = "DRAFT" | "PUBLISHED";

function PublishButton({ status }: { status: EventStatus }) {
  const { pending } = useFormStatus();
  const publishing = status === "DRAFT" ? true : false;
  return (
    <Button type="submit" size="sm" variant={publishing ? "default" : "outline"} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {publishing ? "Publish" : "Unpublish"}
    </Button>
  );
}

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="destructive" disabled={disabled || pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      Delete
    </Button>
  );
}

export function EventActions({
  id,
  status,
}: {
  id: string;
  status: EventStatus;
}) {
  const targetStatus: EventStatus = status === "DRAFT" ? "PUBLISHED" : "DRAFT";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={setEventStatus}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={targetStatus} />
        <PublishButton status={status} />
      </form>

      <Button size="sm" variant="outline" render={<Link href={`/admin/events/${id}/edit`} />}>
        <Pencil />
        Edit
      </Button>

      <form
        action={deleteEvent}
        onSubmit={(e) => {
          if (!window.confirm("Delete this event? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <DeleteButton disabled={false} />
      </form>
    </div>
  );
}