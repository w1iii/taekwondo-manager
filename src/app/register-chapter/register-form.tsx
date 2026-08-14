"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVINCES } from "@/lib/provinces";
import { registerChapter, type RegisterState } from "./actions";

const initialState: RegisterState = { ok: false, error: "" };

export function RegisterChapterForm({
  email,
  defaultCoachName,
}: {
  email: string;
  defaultCoachName?: string;
}) {
  const [state, formAction, pending] = useActionState(registerChapter, initialState);

  if (state.ok) {
    return (
      <div className="rounded-lg border p-6 text-sm">
        <p className="font-medium">Registration submitted.</p>
        <p className="mt-2 text-muted-foreground">
          Our team will review your chapter. Once approved, you&apos;ll get coach
          access automatically — no need to sign up again.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
        Chapter will be linked to your signed-in coach account:{" "}
        <span className="font-medium text-foreground">{email}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Chapter / gym name</Label>
        <Input id="name" name="name" placeholder="e.g. Bacolod Taekwondo Club" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="province">Province</Label>
          <select
            id="province"
            name="province"
            required
            defaultValue=""
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Select province
            </option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City / municipality</Label>
          <Input id="city" name="city" placeholder="e.g. Bacolod City" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gcashNumber">GCash number</Label>
        <Input
          id="gcashNumber"
          name="gcashNumber"
          inputMode="numeric"
          placeholder="09XX XXX XXXX"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="headCoachName">Head coach name</Label>
        <Input
          id="headCoachName"
          name="headCoachName"
          placeholder="Full name"
          defaultValue={defaultCoachName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logo">Chapter logo (optional, 15 MB max)</Label>
        <Input id="logo" name="logo" type="file" accept="image/*" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : null}
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
