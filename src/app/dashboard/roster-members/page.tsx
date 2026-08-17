import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { beltLabel, genderLabel } from "@/lib/athletes";
import { AthleteClubStatus } from "@/generated/prisma/client";

export const metadata = { title: "Roster Members" };

export default async function RosterMembersPage() {
  const user = await requireRole("coach");

  const chapter = await getChapterForUser(user);
  if (!chapter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Roster Members</h1>
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Link your chapter before viewing your roster members. Register your
            chapter on the public site, then wait for approval.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [members, inactiveCount] = await Promise.all([
    db.athleteClub.findMany({
      where: { chapterId: chapter.id, status: AthleteClubStatus.ACTIVE },
      include: { athlete: true },
      orderBy: { athlete: { name: "asc" } },
    }),
    db.athleteClub.count({
      where: { chapterId: chapter.id, status: AthleteClubStatus.INACTIVE },
    }),
  ]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roster Members</h1>
        <p className="text-sm text-muted-foreground">
          {chapter.name} · {members.length} registered athlete
          {members.length === 1 ? "" : "s"}
        </p>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            No roster members yet. Athletes added on My Roster become members of
            this club automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <ul className="space-y-2">
            {members.map((member) => {
              const athlete = member.athlete;
              return (
                <li key={member.id}>
                  <Card size="sm">
                    <CardContent className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {athlete.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {athlete.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {genderLabel(athlete.gender)} ·{" "}
                          {beltLabel(athlete.beltType)} ·{" "}
                          {currentYear - athlete.birthYear} years old
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <Badge variant="secondary" className="capitalize">
                          {member.status.toLowerCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Since{" "}
                          {member.joinedAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
          {inactiveCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {inactiveCount} inactive member{inactiveCount === 1 ? "" : "s"} not
              shown.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}