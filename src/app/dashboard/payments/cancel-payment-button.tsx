"use client";

import { startTransition, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
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
    if (!nextOpen && state.ok) {
      setReason("");
      router.refresh();
    }
    setOpen(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="destructive" size="sm" />
        }
      >
        <XCircle className="size-4" />
        Cancel
      </SheetTrigger>
      <SheetContent side="bottom" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cancel Payment</SheetTitle>
          <SheetDescription>
            Please provide a reason for cancelling this payment.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-4">
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

          <SheetFooter>
            <SheetClose
              render={<Button variant="ghost" type="button" />}
            >
              Back
            </SheetClose>
            <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Cancelling…" : "Confirm Cancel"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
