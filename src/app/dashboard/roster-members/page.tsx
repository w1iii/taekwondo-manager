import Link from "next/link";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";
import { requireRole } from "@/lib/auth";
import { getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { beltLabel, genderLabel } from "@/lib/athletes";
import { AthleteClubStatus } from "@/generated/prisma/client";
import {
  pageCount,
  pageHref,
  clampPage,
  parsePage,
} from "@/lib/pagination";

export const metadata = { title: "Roster Members" };

const ROSTER_MEMBERS_PAGE_SIZE = 5;

export default async function RosterMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
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

  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const requestedPage = parsePage(pageParam);

  const where = {
    chapterId: chapter.id,
    status: AthleteClubStatus.ACTIVE,
    athlete: query ? { is: { name: { contains: query, mode: "insensitive" as const } } } : undefined,
  };

  const [members, totalMembers, inactiveCount] = await Promise.all([
    db.athleteClub.findMany({
      where,
      include: { athlete: true },
      orderBy: { athlete: { name: "asc" } },
      skip: (requestedPage - 1) * ROSTER_MEMBERS_PAGE_SIZE,
      take: ROSTER_MEMBERS_PAGE_SIZE,
    }),
    db.athleteClub.count({ where }),
    db.athleteClub.count({
      where: { chapterId: chapter.id, status: AthleteClubStatus.INACTIVE },
    }),
  ]);

  const totalPages = pageCount(totalMembers, ROSTER_MEMBERS_PAGE_SIZE);
  const membersPage = clampPage(requestedPage, totalPages);
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roster Members</h1>
        <p className="text-sm text-muted-foreground">
          {chapter.name} · {totalMembers} registered athlete
          {totalMembers === 1 ? "" : "s"}
        </p>
      </div>

      <form
        method="get"
        action="/dashboard/roster-members"
        className="flex items-center gap-2"
      >
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search roster members by name"
          className="h-8"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
        {query ? (
          <Button
            render={<Link href="/dashboard/roster-members" />}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
        ) : null}
      </form>

      {totalMembers === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Users className="size-8" />
            {query
              ? `No roster members match “${query}”.`
              : "No roster members yet. Athletes added on My Roster become members of this club automatically."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {query ? (
            <p className="text-sm text-muted-foreground">
              {totalMembers} member{totalMembers === 1 ? "" : "s"} matching
              “{query}”
            </p>
          ) : null}
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

      <Pagination
        page={membersPage}
        totalPages={totalPages}
        buildHref={(page) => pageHref({ q: query || undefined }, "page", page)}
      />
    </div>
  );
}