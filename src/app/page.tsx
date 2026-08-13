import Link from "next/link";
import { ClipboardList, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/roles";

const features = [
  {
    icon: Users,
    title: "Coach-side registration",
    description:
      "Register athletes once, then enter each event as a team. One submission, one payment for the whole chapter.",
  },
  {
    icon: ClipboardList,
    title: "Paperless approvals",
    description:
      "Organizers approve chapters and payments in one queue. No more spreadsheets or receipts in your inbox.",
  },
  {
    icon: Trophy,
    title: "Live brackets",
    description:
      "Fair, random draws with instant result entry. Brackets and schedules update the moment a match ends.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const authenticated = user !== null;
  const home = authenticated ? roleHome(user.role) : "/sign-in";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center gap-4 border-b px-4 sm:px-8">
        <span className="text-lg leading-none">🥋</span>
        <span className="text-sm font-semibold tracking-tight">
          Taekwondo Tournament Manager
        </span>
        <div className="ml-auto flex items-center gap-2">
          {authenticated ? (
            <Button variant="outline" render={<Link href={home} />}>
              My dashboard
            </Button>
          ) : (
            <>
              <Button variant="outline" render={<Link href="/sign-in" />}>
                Sign in
              </Button>
              <Button render={<Link href="/sign-up" />}>Sign up</Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-16 sm:px-8">
        <section className="text-center">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Tournament day, minus the paperwork.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Chapter coaches register teams and pay once. Organizers approve,
            draw brackets, and report results live. No public access — coaches
            and organizers only.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {authenticated ? (
              <Button size="lg" render={<Link href={home} />}>
                Open your dashboard
              </Button>
            ) : (
              <>
                <Button size="lg" render={<Link href="/sign-up" />}>
                  Create an account
                </Button>
                <Button size="lg" variant="outline" render={<Link href="/sign-in" />}>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="mb-2 size-6 text-primary" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        Access is limited to signed-in coaches and organizers.
      </footer>
    </div>
  );
}