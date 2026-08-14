import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { formatDate, formatPesos } from "@/lib/events";
import { genderLabel } from "@/lib/athletes";
import { ageForEventYear } from "@/lib/brackets";
import { proofStatusLabel, proofStatusVariant } from "@/lib/payments";
import { PaymentStatus } from "@/generated/prisma/client";

export const metadata = { title: "Athlete" };

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("coach");

  const { id } = await params;
  const chapter = await getChapterForUser(user);
  if (!chapter) notFound();

  const athlete = await db.athlete.findFirst({
    where: { id, chapterId: chapter.id },
  });
  if (!athlete) notFound();

  const enrollments = await db.enrollment.findMany({
    where: { athleteId: id, chapterId: chapter.id },
    include: { event: { include: { divisions: true } } },
    orderBy: { createdAt: "desc" },
  });

  const eventIds = enrollments.map((e) => e.eventId);
  const payments = await db.teamPayment.findMany({
    where: { chapterId: chapter.id, eventId: { in: eventIds } },
  });
  const paymentByEvent = new Map(payments.map((p) => [p.eventId, p]));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{athlete.name}</h1>
          <p className="text-sm text-muted-foreground">{chapter.name}</p>
        </div>
        <Button render={<Link href="/dashboard/roster" />} variant="outline">
          <ArrowLeft />
          Back to roster
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-1 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Gender:</span>
            <Badge variant="secondary">{genderLabel(athlete.gender)}</Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Birth year:</span>{" "}
            {athlete.birthYear}
          </p>
          <p>
            <span className="text-muted-foreground">Weight:</span>{" "}
            {athlete.weightKg > 0 ? `${athlete.weightKg} kg` : "Not set"}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tournaments · {enrollments.length}
        </h2>

        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <Trophy className="size-8" />
              Not registered for any tournament yet.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {enrollments.map(({ id: enrollmentId, event }) => {
              const age = ageForEventYear(athlete.birthYear, event.eventDate.getFullYear());
              const division = event.divisions.find(
                (d) =>
                  d.gender === athlete.gender &&
                  age >= d.minAge &&
                  age <= d.maxAge,
              );
              const payment = paymentByEvent.get(event.id);

              return (
                <li key={enrollmentId} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2 font-medium">
                        <CalendarDays className="size-4" />
                        {event.name}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(event.eventDate)} · {event.location}
                      </p>
                      <p>
                        Division:{" "}
                        {division ? (
                          <span className="font-medium">{division.name}</span>
                        ) : (
                          <span className="text-muted-foreground">Not generated yet</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {payment ? (
                        <Badge variant={proofStatusVariant(payment.status)}>
                          {proofStatusLabel(payment.status)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No payment</Badge>
                      )}
                      {payment?.status === PaymentStatus.APPROVED ? (
                        <span className="text-xs text-emerald-600">Verified</span>
                      ) : (
                        <span className="text-xs text-amber-600">Pending</span>
                      )}
                    </div>
                  </div>

                  {payment ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Team payment {formatPesos(payment.amountPesos)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Entry fee applies once the chapter submits team payment.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}