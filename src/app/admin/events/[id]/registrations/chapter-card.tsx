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

type Payment = {
  status: string;
} | null;

type Enrollment = {
  id: string;
  athlete: Athlete;
};

export function ChapterCard({
  chapter,
  rows,
  payment,
  entryFeePesos,
}: {
  chapter: Chapter;
  rows: Enrollment[];
  payment: Payment;
  entryFeePesos: number;
}) {
  const [open, setOpen] = useState(false);

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
                {rows.length} athlete{rows.length === 1 ? "" : "s"} ·{" "}
                {formatPesos(rows.length * entryFeePesos)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {payment ? (
              <Badge variant={proofStatusVariant(payment.status)}>
                {proofStatusLabel(payment.status)}
              </Badge>
            ) : (
              <Badge variant="outline">No payment</Badge>
            )}
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

            <ul className="divide-y rounded-lg border bg-card">
              {rows.map(({ id: enrollmentId, athlete }) => (
                <li
                  key={enrollmentId}
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
      </CardContent>
    </Card>
  );
}
