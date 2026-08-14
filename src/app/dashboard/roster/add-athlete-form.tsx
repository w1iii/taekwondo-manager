"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENDER_OPTIONS, type AthleteFormState } from "@/lib/athletes";

const initialState: AthleteFormState = { ok: false, error: "" };

export function AddAthleteForm({
  action,
}: {
  action: (formData: FormData) => Promise<AthleteFormState>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (_prev: AthleteFormState, formData: FormData) => action(formData),
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="e.g. Andres Bonifacio" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Select
            </option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="birthYear">Birth year</Label>
          <Input id="birthYear" name="birthYear" type="number" min={1950} step={1} placeholder="e.g. 2013" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="weightKg">Weight (kg, optional)</Label>
          <Input id="weightKg" name="weightKg" type="number" min={0} max={200} step={1} placeholder="e.g. 45" />
          <p className="text-xs text-muted-foreground">Used for weight-class divisions.</p>
        </div>
      </div>

      {state.ok ? null : state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {pending ? "Adding…" : "Add athlete"}
      </Button>
    </form>
  );
}