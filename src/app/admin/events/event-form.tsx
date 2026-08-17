"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageFile } from "@/lib/client-image";
import type { DivisionOption } from "@/lib/divisions";
import {
  DEFAULT_ENTRY_FEE_PESOS,
  MAX_EVENT_IMAGE_BYTES,
  dateInputValue,
  datetimeLocalInputValue,
  type EventFormState,
} from "@/lib/events";

const initialState: EventFormState = { ok: false, error: "" };

const MAX_IMAGE_MB = Math.round(MAX_EVENT_IMAGE_BYTES / 1_048_576);

export type EventFormValues = {
  id?: string;
  name: string;
  description: string | null;
  location: string;
  imageUrl: string | null;
  eventDate: Date;
  registrationDeadline: Date;
  entryFeePesos: number;
};

export function EventForm({
  action,
  values,
  candidateDivisions,
  defaultDivisionKeys = [],
}: {
  action: (formData: FormData) => Promise<EventFormState>;
  values?: EventFormValues;
  candidateDivisions?: DivisionOption[];
  defaultDivisionKeys?: string[];
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: EventFormState, formData: FormData) => action(formData),
    initialState,
  );
  const [preview, setPreview] = useState<string | null>(values?.imageUrl ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
  const compressedImageRef = useRef<File | null>(null);

  const [selectedDivs, setSelectedDivs] = useState<Set<string>>(
    () => new Set(defaultDivisionKeys),
  );

  const toggleDiv = (key: string) => {
    setSelectedDivs((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groups =
    candidateDivisions?.reduce<{ label: string; options: DivisionOption[] }[]>(
      (acc, option) => {
        const group = acc.find((g) => g.label === option.eventTypeLabel);
        if (group) group.options.push(option);
        else acc.push({ label: option.eventTypeLabel, options: [option] });
        return acc;
      },
      [],
    ) ?? [];

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.size > MAX_EVENT_IMAGE_BYTES) {
      setImageError(`Image exceeds the maximum size (${MAX_IMAGE_MB} MB).`);
      setPreview(values?.imageUrl ?? null);
      compressedImageRef.current = null;
      e.target.value = "";
      return;
    }
    setImageError(null);
    setPreview(file ? URL.createObjectURL(file) : (values?.imageUrl ?? null));
    compressedImageRef.current = file ? await compressImageFile(file) : null;
  }

  return (
    <form
      action={async (formData) => {
        if (compressedImageRef.current) {
          formData.set("image", compressedImageRef.current, compressedImageRef.current.name);
        }
        try {
          await formAction(formData);
        } catch {
          // Next.js throws before the action runs when the request body exceeds
          // serverActions.bodySizeLimit (e.g. oversized image). Surface it as a
          // form error instead of an unhandled rejection.
          // Note: state will not update here since formAction already ran,
          // but the error is logged and the form won't navigate away.
        }
      }}
      className="space-y-4"
    >
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

      <div className="space-y-1.5">
        <Label htmlFor="image">Event image (optional, {MAX_IMAGE_MB} MB max)</Label>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local uploads need the session cookie
          <img
            src={preview}
            alt="Event image preview"
            className="h-40 w-full rounded-lg border object-cover bg-muted/40"
          />
        ) : null}
        <Input id="image" name="image" type="file" accept="image/*" onChange={onImageChange} />
        {imageError ? (
          <p role="alert" className="text-sm text-destructive">
            {imageError}
          </p>
        ) : null}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImagePlus className="size-3.5" />
          Picking a new file replaces the current image.
        </p>
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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label>Available divisions</Label>
            <p className="text-xs text-muted-foreground">
              Pick which divisions coaches may register athletes into. Only
              divisions with registered players appear in brackets.
            </p>
          </div>
          <span className="text-xs font-medium">
            {selectedDivs.size}
            {candidateDivisions ? ` of ${candidateDivisions.length}` : ""} selected
          </span>
        </div>

        {candidateDivisions && candidateDivisions.length === 0 ? (
          <p className="text-sm text-destructive">
            No weight classes configured. Add WT weight classes before choosing divisions.
          </p>
        ) : null}

        <div className="space-y-4 rounded-lg border bg-card p-3">
          {groups.map((group) => {
            const selectedInGroup = group.options.filter((o) =>
              selectedDivs.has(o.divisionKey),
            ).length;
            const allInGroup = selectedInGroup === group.options.length;
            return (
              <div key={group.label} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label} · {selectedInGroup}/{group.options.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDivs((current) => {
                        const next = new Set(current);
                        for (const o of group.options) {
                          if (allInGroup) next.delete(o.divisionKey);
                          else next.add(o.divisionKey);
                        }
                        return next;
                      });
                    }}
                    className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    {allInGroup ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  {group.options.map((option) => (
                    <label
                      key={option.divisionKey}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="divisionKey"
                        value={option.divisionKey}
                        checked={selectedDivs.has(option.divisionKey)}
                        onChange={() => toggleDiv(option.divisionKey)}
                        className="size-4"
                      />
                      <span className="truncate">
                        {option.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {option.gender === "MALE" ? "M" : "F"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
