"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_ENTRY_FEE_PESOS,
  dateInputValue,
  datetimeLocalInputValue,
  type EventFormState,
} from "@/lib/events";

const initialState: EventFormState = { ok: false, error: "" };

export type EventFormValues = {
  id?: string;
  name: string;
  description: string | null;
  location: string;
  eventDate: Date;
  registrationDeadline: Date;
  entryFeePesos: number;
};

export function EventForm({
  action,
  values,
}: {
  action: (formData: FormData) => Promise<EventFormState>;
  values?: EventFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: EventFormState, formData: FormData) => action(formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="space-y-1.5">
        <Label htmlFor="name">Event name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Region VI Open Championship 2026"
          defaultValue={values?.name}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={values?.description ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Divisions, schedule notes, venue details…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          placeholder="e.g. Bacolod Convention Center"
          defaultValue={values?.location}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="eventDate">Event date</Label>
          <Input
            id="eventDate"
            name="eventDate"
            type="date"
            defaultValue={values ? dateInputValue(values.eventDate) : undefined}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registrationDeadline">Registration deadline</Label>
          <Input
            id="registrationDeadline"
            name="registrationDeadline"
            type="datetime-local"
            defaultValue={
              values ? datetimeLocalInputValue(values.registrationDeadline) : undefined
            }
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entryFeePesos">
          Entry fee per athlete (₱)
        </Label>
        <Input
          id="entryFeePesos"
          name="entryFeePesos"
          type="number"
          min={0}
          step={1}
          defaultValue={values?.entryFeePesos ?? DEFAULT_ENTRY_FEE_PESOS}
          className="sm:max-w-40"
        />
        <p className="text-xs text-muted-foreground">
          Defaults to ₱{DEFAULT_ENTRY_FEE_PESOS.toLocaleString("en-PH")}. Applied when
          chapters submit their team payment.
        </p>
      </div>

      {state.ok ? null : state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Saving…" : values ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}
