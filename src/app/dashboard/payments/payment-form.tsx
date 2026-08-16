"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageFile } from "@/lib/client-image";
import type { PaymentFormState } from "@/lib/payments";

const initialState: PaymentFormState = { ok: false, error: "" };

export function PaymentForm({
  orderId,
  action,
  defaultReference,
}: {
  orderId: string;
  action: (formData: FormData) => Promise<PaymentFormState>;
  defaultReference?: string;
}) {
  const [state, formAction, pending] = useActionState(
    (_prev: PaymentFormState, formData: FormData) => action(formData),
    initialState,
  );
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const compressedFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    compressedFileRef.current = await compressImageFile(file);
  }

  return (
    <form
      action={async (formData) => {
        if (compressedFileRef.current) {
          formData.set("proof", compressedFileRef.current, compressedFileRef.current.name);
        }
        await formAction(formData);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor={`ref-${orderId}`}>GCash reference number</Label>
        <Input
          id={`ref-${orderId}`}
          name="referenceNo"
          placeholder="e.g. 4412 9912 0193"
          defaultValue={defaultReference}
          required
          minLength={4}
          maxLength={60}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`proof-${orderId}`}>Proof of payment (screenshot)</Label>
        <Input
          id={`proof-${orderId}`}
          name="proof"
          type="file"
          accept="image/*"
          required
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">
          {fileName || "Screenshot of your GCash transfer. 15 MB max."}
        </p>
      </div>

      {state.ok ? null : state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Receipt />}
        {pending ? "Submitting…" : "Submit payment"}
      </Button>
    </form>
  );
}
