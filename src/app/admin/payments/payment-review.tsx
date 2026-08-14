"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { approvePayment, rejectPayment } from "./actions";

function SubmitButton({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function PaymentReviewActions({ id }: { id: string }) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={approvePayment}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton label="Approve" />
      </form>

      {rejecting ? (
        <form action={rejectPayment} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <input
            type="text"
            name="reason"
            placeholder="Reason (optional)"
            className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <SubmitButton label="Reject" variant="destructive" />
        </form>
      ) : (
        <Button variant="outline" onClick={() => setRejecting(true)}>
          Reject
        </Button>
      )}
    </div>
  );
}