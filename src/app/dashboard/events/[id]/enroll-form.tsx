"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPesos } from "@/lib/events";
import { genderLabel } from "@/lib/athletes";
import type { Athlete } from "@/generated/prisma/client";
import type { EnrollState } from "../actions";

const initialState: EnrollState = { ok: false, error: "" };

export function EnrollForm({
  eventId,
  fee,
  athletes,
  action,
}: {
  eventId: string;
  fee: number;
  athletes: Athlete[];
  action: (formData: FormData) => Promise<EnrollState>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(
    (_prev: EnrollState, formData: FormData) => action(formData),
    initialState,
  );
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id],
    );
  };

  const total = selected.length * fee;

  async function handleSubmit(formData: FormData) {
    selected.forEach((id) => formData.append("athleteId", id));
    const result = (await formAction(formData)) as unknown as EnrollState;
    if (result.ok) {
      setSelected([]);
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      <ul className="space-y-2">
        {athletes.map((athlete) => (
          <li key={athlete.id}>
            <label className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(athlete.id)}
                onChange={() => toggle(athlete.id)}
                className="size-4"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{athlete.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {genderLabel(athlete.gender)} · born {athlete.birthYear}
                  {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
        <span>
          {selected.length} athlete{selected.length === 1 ? "" : "s"} ×{" "}
          {formatPesos(fee)}
        </span>
        <span className="font-semibold">Total: {formatPesos(total)}</span>
      </div>

      {state.ok ? (
        <p className="text-sm text-emerald-600">Registered. Roster updated below.</p>
      ) : state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || selected.length === 0}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Registering…" : "Register selected athletes"}
      </Button>
    </form>
  );
}