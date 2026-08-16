"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageFile } from "@/lib/client-image";
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
}: {
  action: (formData: FormData) => Promise<EventFormState>;
  values?: EventFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: EventFormState, formData: FormData) => action(formData),
    initialState,
  );
  const [preview, setPreview] = useState<string | null>(values?.imageUrl ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
  const compressedImageRef = useRef<File | null>(null);

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
