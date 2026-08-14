"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentFormState } from "@/lib/payments";

const initialState: PaymentFormState = { ok: false, error: "" };

export function PaymentForm({
  eventId,
  action,
  defaultReference,
  resubmitting,
}: {
  eventId: string;
  action: (formData: FormData) => Promise<PaymentFormState>;
  defaultReference?: string;
  resubmitting?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: PaymentFormState, formData: FormData) => action(formData),
    initialState,
  );
  const router = useRouter();
  const [fileName, setFileName] = useState("");

  async function handleSubmit(formData: FormData) {
    const result = (await formAction(formData)) as unknown as PaymentFormState;
    if (result.ok) router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="space-y-1.5">
        <Label htmlFor={`ref-${eventId}`}>GCash reference number</Label>
        <Input
          id={`ref-${eventId}`}
          name="referenceNo"
          placeholder="e.g. 4412 9912 0193"
          defaultValue={defaultReference}
          required
          minLength={4}
          maxLength={60}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`proof-${eventId}`}>Proof of payment (screenshot)</Label>
        <Input
          id={`proof-${eventId}`}
          name="proof"
          type="file"
          accept="image/*"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        <p className="text-xs text-muted-foreground">
          {fileName || "Screenshot of your GCash transfer. 2 MB max."}
        </p>
      </div>

      {state.ok ? null : state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Receipt />}
        {pending
          ? "Submitting…"
          : resubmitting
            ? "Resubmit payment"
            : "Submit payment"}
      </Button>
    </form>
  );
}