export const MAX_PROOF_BYTES = 15 * 1024 * 1024;

export type BadgeVariant = "default" | "secondary" | "destructive";

export function proofStatusVariant(status: string): BadgeVariant {
  return status === "APPROVED"
    ? "default"
    : status === "PENDING"
      ? "secondary"
      : "destructive";
}

export function proofStatusLabel(status: string): string {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  return "Pending review";
}

export function receiptNumber(paymentId: string): string {
  return `RCPT-${paymentId.slice(0, 8).toUpperCase()}`;
}

export type PaymentFormState = { ok: true } | { ok: false; error: string };

export type ParsedPaymentForm =
  | { ok: true; data: { referenceNo: string; proof: File } }
  | { ok: false; error: string };

export function parsePaymentFormData(formData: FormData): ParsedPaymentForm {
  const referenceNo = (formData.get("referenceNo") as string | null)?.trim() ?? "";
  const proof = (formData.get("proof") as File | null) ?? null;

  if (referenceNo.length < 4) {
    return { ok: false, error: "Enter the GCash reference number (4+ characters)." };
  }
  if (referenceNo.length > 60) {
    return { ok: false, error: "Reference number is too long." };
  }
  if (!proof || proof.size === 0) {
    return { ok: false, error: "Attach a screenshot of your GCash transfer." };
  }
  if (!proof.type.startsWith("image/")) {
    return { ok: false, error: "Proof of payment must be an image." };
  }
  if (proof.size > MAX_PROOF_BYTES) {
    return { ok: false, error: "Proof must be 15 MB or smaller." };
  }

  return { ok: true, data: { referenceNo, proof } };
}
