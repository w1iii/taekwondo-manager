import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { claimChapterForUser, getChapterForUser } from "@/lib/chapters";
import { db } from "@/lib/db";
import { ChapterStatus } from "@/generated/prisma/client";
import { RegisterChapterForm } from "./register-form";

export const metadata = { title: "Register your chapter" };

export default async function RegisterChapterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role === "organizer") redirect("/admin");
  if (user.chapterId) redirect("/dashboard");

  const chapter = await getChapterForUser(user);

  if (chapter?.status === ChapterStatus.APPROVED) {
    await claimChapterForUser(user);
    redirect("/dashboard");
  }

  const pending = await db.chapter.findFirst({
    where: {
      headCoachEmail: user.email,
      status: ChapterStatus.PENDING,
    },
  });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center gap-4 border-b px-4 sm:px-8">
        <Link href="/" className="text-lg leading-none">
          🥋
        </Link>
        <span className="text-sm font-semibold tracking-tight">
          TKD ARENA
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Register your chapter</h1>

        {pending ? (
          <div className="mt-8">
            <Card>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">Application under review.</p>
                <p className="text-muted-foreground">
                  Your chapter is pending an organizer&apos;s approval. You&apos;ll
                  get coach access automatically once it&apos;s approved.
                </p>
                <p className="text-xs text-muted-foreground">
                  Registered under {pending.name} · {pending.city}, {pending.province}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mt-8">
            <RegisterChapterForm email={user.email ?? ""} defaultCoachName={user.name} />
          </div>
        )}
      </main>
    </div>
  );
}