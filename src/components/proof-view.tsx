import { Badge } from "@/components/ui/badge";
import { PaymentStatus } from "@/generated/prisma/client";
import { proofStatusLabel, proofStatusVariant } from "@/lib/payments";

export function ProofView({
  proofUrl,
  referenceNo,
  amount,
  status,
  submitted,
  rejectionReason,
}: {
  proofUrl: string;
  referenceNo: string;
  amount: string;
  status: PaymentStatus;
  submitted: string;
  rejectionReason?: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated local files must load with the session cookie */}
      <img
        src={proofUrl}
        alt="Proof of payment screenshot"
        className="max-h-[60vh] w-full rounded-lg border object-contain bg-muted/40"
      />

      <dl className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-medium">{referenceNo}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium">{amount}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Submitted</dt>
          <dd>{submitted}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <Badge variant={proofStatusVariant(status)}>
              {proofStatusLabel(status)}
            </Badge>
          </dd>
        </div>
        {rejectionReason ? (
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">Reason</dt>
            <dd className="text-right text-destructive">{rejectionReason}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}