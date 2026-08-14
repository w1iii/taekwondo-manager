"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ActionButton({
  label,
  pendingLabel,
  variant = "default",
  size = "sm",
}: {
  label: string;
  pendingLabel?: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  size?: "sm" | "xs" | "default";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? (pendingLabel ?? label) : label}
    </Button>
  );
}