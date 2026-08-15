"use client";

import { startTransition, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CancelPaymentState } from "./actions";

const initialState: CancelPaymentState = { ok: false, error: "" };

export function CancelPaymentButton({
  paymentId,
  action,
}: {
  paymentId: string;
  action: (paymentId: string, reason: string) => Promise<CancelPaymentState>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(
    (_prev: CancelPaymentState, formData: FormData) => {
      const reasonValue = String(formData.get("reason") ?? "");
      return action(paymentId, reasonValue);
    },
    initialState,
  );
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    startTransition(() => {
      const formData = new FormData();
      formData.set("reason", reason);
      formAction(formData);
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setReason("");
    }
  };

  if (state.ok && open) {
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        render={
          <Button variant="destructive" size="sm" />
        }
      >
        <XCircle className="size-4" />
        Cancel
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Cancel Payment</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Please provide a reason for cancelling this payment.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Reason</Label>
              <Input
                id="cancel-reason"
                name="reason"
                placeholder="e.g. Wrong amount submitted"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
                maxLength={200}
              />
            </div>

            {"error" in state && state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Dialog.Close
                render={<Button variant="ghost" type="button" />}
              >
                Back
              </Dialog.Close>
              <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? "Cancelling…" : "Confirm Cancel"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
