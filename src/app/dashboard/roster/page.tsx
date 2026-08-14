import { Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { AddAthleteForm } from "./add-athlete-form";
import { AthleteRow } from "./athlete-row";
import { createAthlete, deleteAthlete, updateAthlete } from "./actions";

export const metadata = { title: "My Roster" };

export default async function RosterPage() {
  const user = await requireRole("coach");

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My Roster</h1>
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Link your chapter before managing a roster. Register your chapter on
            the public site, then wait for approval.
          </CardContent>
        </Card>
      </div>
    );
  }

  const athletes = await db.athlete.findMany({
    where: { chapterId: chapter.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Roster</h1>
        <p className="text-sm text-muted-foreground">
          {chapter.name} · {athletes.length} athlete
          {athletes.length === 1 ? "" : "s"} on file
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Add athlete
        </h2>
        <Card>
          <CardContent>
            <AddAthleteForm action={createAthlete} />
          </CardContent>
        </Card>
      </section>

      {athletes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            No athletes yet. Add your first athlete to get started.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {athletes.map((athlete) => (
            <AthleteRow
              key={athlete.id}
              athlete={athlete}
              updateAction={updateAthlete}
              deleteAction={deleteAthlete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}