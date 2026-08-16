"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { genderLabel } from "@/lib/athletes";
import { formatPesos } from "@/lib/events";
import { proofStatusLabel, proofStatusVariant } from "@/lib/payments";

type Athlete = {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE";
  birthYear: number;
  weightKg: number;
};

type Chapter = {
  id: string;
  name: string;
  province: string;
  city: string;
  headCoachName: string;
  headCoachEmail: string;
  gcashNumber: string;
  logoUrl?: string | null;
};

type Order = {
  status: string;
  items: {
    id: string;
    athlete: Athlete;
  }[];
  payments: {
    outcome: string;
    amountPesos: number;
  }[];
};

type ApprovedAthleteEntry = {
  athlete: Athlete;
};

export function ChapterCard({
  chapter,
  order,
  approvedAthletes,
}: {
  chapter: Chapter;
  order: Order;
  approvedAthletes: ApprovedAthleteEntry[];
}) {
  const [open, setOpen] = useState(false);
  const latestPayment = order.payments[0];

  return (
    <Card>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold">{chapter.name}</p>
              <p className="text-sm text-muted-foreground">
                {chapter.province}, {chapter.city} ·{" "}
                {approvedAthletes.length} approved athlete{approvedAthletes.length === 1 ? "" : "s"} ·{" "}
                {order.items.length} pending
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={proofStatusVariant(order.status)}>
              {proofStatusLabel(order.status)}
            </Badge>
          </div>
        </button>

        {open && (
          <div className="space-y-3 pl-6">
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Head Coach</p>
                <p>{chapter.headCoachName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p>{chapter.headCoachEmail}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">GCash Number</p>
                <p>{chapter.gcashNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Location</p>
                <p>{chapter.city}, {chapter.province}</p>
              </div>
            </div>

            {order.items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Pending order ({order.items.length}):
                </p>
                <ul className="divide-y rounded-lg border bg-card">
                  {order.items.map(({ id: itemId, athlete }) => (
                    <li
                      key={itemId}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{athlete.name}</span>
                      <span className="text-muted-foreground">
                        {genderLabel(athlete.gender)} · born {athlete.birthYear}
                        {athlete.weightKg > 0 ? ` · ${athlete.weightKg} kg` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {approvedAthletes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Approved ({approvedAthletes.length}):
                </p>
                <ul className="divide-y rounded-lg border bg-card">
                  {approvedAthletes.map(({ athlete }) => (
                    <li
                      key={athlete.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{athlete.name}</span>
                      <Badge variant="default">Approved</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {latestPayment && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  Payment: {formatPesos(latestPayment.amountPesos)} ·{" "}
                  <Badge variant={proofStatusVariant(latestPayment.outcome)}>
                    {proofStatusLabel(latestPayment.outcome)}
                  </Badge>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
