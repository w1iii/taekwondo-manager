"use client";

import { startTransition, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPesos } from "@/lib/events";
import { genderLabel } from "@/lib/athletes";
import type { AvailableDivisionOption } from "@/lib/divisions";
import type { Athlete } from "@/generated/prisma/client";
import type { RegisterState } from "../actions";

const initialState: RegisterState = { ok: false, error: "" };

export function EnrollForm({
  eventId,
  fee,
  athletes,
  availableByAthlete,
  action,
}: {
  eventId: string;
  fee: number;
  athletes: Athlete[];
  availableByAthlete: Record<string, AvailableDivisionOption[]>;
  action: (formData: FormData) => Promise<RegisterState>;
}) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [divisions, setDivisions] = useState<Record<string, string[]>>({});
  const [state, formAction, pending] = useActionState(
    (_prev: RegisterState, formData: FormData) => action(formData),
    initialState,
  );
  const router = useRouter();

  const selectedAthletes = athletes.filter((a) => toggled[a.id]);

  const toggle = (id: string) => {
    setToggled((current) => ({ ...current, [id]: !current[id] }));
  };

  const setDivisionSelection = (id: string, values: string[]) => {
    setDivisions((current) => ({ ...current, [id]: values }));
  };

  const total = selectedAthletes.length * fee;

  async function handleSubmit(formData: FormData) {
    for (const athlete of selectedAthletes) {
      const picks = divisions[athlete.id] ?? [];
      if (picks.length === 0) continue;
      formData.append("athleteId", athlete.id);
      for (const key of picks) formData.append(`divisionKey:${athlete.id}`, key);
    }
    setToggled({});
    setDivisions({});
    startTransition(() => {
      formAction(formData);
    });
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      <ul className="space-y-2">
        {athletes.map((athlete) => {
          const options = availableByAthlete[athlete.id] ?? [];
          const valid = options.length > 0;
          const checked = toggled[athlete.id] ?? false;
          return (
            <li key={athlete.id} className="rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!valid}
                  onChange={() => toggle(athlete.id)}
                  className="size-4"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{athlete.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {genderLabel(athlete.gender)} · born {athlete.birthYear}
                    {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                    {athlete.beltType ? ` · ${athlete.beltType}` : ""}
                  </span>
                </span>
              </div>

              {valid ? (
                <div className="mt-2 pl-7">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Divisions to enter ({options.length})
                  </label>
                  <select
                    multiple
                    value={divisions[athlete.id] ?? []}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setDivisionSelection(athlete.id, values);
                      if (values.length > 0 && !toggled[athlete.id]) toggle(athlete.id);
                    }}
                    className="w-full rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {options.map((option) => (
                      <option key={option.divisionKey} value={option.divisionKey}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hold Ctrl/Cmd to pick multiple divisions.
                  </p>
                </div>
              ) : (
                <p className="mt-1 pl-7 text-xs text-muted-foreground">
                  No divisions available for this athlete&apos;s gender, age, weight, and belt.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
        <span>
          {selectedAthletes.length} athlete{selectedAthletes.length === 1 ? "" : "s"} ×{" "}
          {formatPesos(fee)}
        </span>
        <span className="font-semibold">Total: {formatPesos(total)}</span>
      </div>

      {state.ok ? (
        <p className="text-sm text-emerald-600">Order created. Go to Payments to submit proof.</p>
      ) : state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || selectedAthletes.length === 0}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Creating order…" : "Create order"}
      </Button>
    </form>
  );
}