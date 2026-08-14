"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENDER_OPTIONS, BELT_OPTIONS, beltLabel, genderLabel, type AthleteFormState } from "@/lib/athletes";
import type { Athlete, Gender } from "@/generated/prisma/client";

const initialState: AthleteFormState = { ok: false, error: "" };

export function AthleteRow({
  athlete,
  updateAction,
  deleteAction,
}: {
  athlete: Athlete;
  updateAction: (formData: FormData) => Promise<AthleteFormState>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (_prev: AthleteFormState, formData: FormData) => updateAction(formData),
    initialState,
  );

  async function handleUpdate(formData: FormData) {
    const result = (await formAction(formData)) as unknown as AthleteFormState;
    if (result.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  if (editing) {
    return (
      <li className="rounded-lg border bg-card p-4">
        <form action={handleUpdate} className="space-y-4">
          <input type="hidden" name="id" value={athlete.id} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor={`name-${athlete.id}`}>Full name</Label>
              <Input
                id={`name-${athlete.id}`}
                name="name"
                defaultValue={athlete.name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`gender-${athlete.id}`}>Gender</Label>
              <select
                id={`gender-${athlete.id}`}
                name="gender"
                defaultValue={athlete.gender}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`birthYear-${athlete.id}`}>Birth year</Label>
              <Input
                id={`birthYear-${athlete.id}`}
                name="birthYear"
                type="number"
                min={1950}
                step={1}
                defaultValue={athlete.birthYear}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`weightKg-${athlete.id}`}>Weight (kg)</Label>
              <Input
                id={`weightKg-${athlete.id}`}
                name="weightKg"
                type="number"
                min={0}
                max={200}
                step={1}
                defaultValue={athlete.weightKg}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`beltType-${athlete.id}`}>Belt</Label>
              <select
                id={`beltType-${athlete.id}`}
                name="beltType"
                defaultValue={athlete.beltType ?? ""}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">No belt</option>
                {BELT_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.ok ? null : state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending} size="sm">
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <Link
        href={`/dashboard/roster/${athlete.id}`}
        className="group flex min-w-0 items-center gap-2"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-medium">
            {athlete.name}
            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{genderLabel(athlete.gender as Gender)}</Badge>
            <span>Born {athlete.birthYear}</span>
            {athlete.weightKg > 0 ? <span>{athlete.weightKg} kg</span> : null}
            {athlete.beltType ? <Badge variant="outline">{beltLabel(athlete.beltType)}</Badge> : null}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil />
          Edit
        </Button>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!window.confirm(`Remove ${athlete.name} from your roster?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={athlete.id} />
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 />
            Delete
          </Button>
        </form>
      </div>
    </li>
  );
}