import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import { unstable_cache } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/roles";
import { db } from "@/lib/db";
import {
  formatDate,
  formatPesos,
  formatDeadline,
  isEventUpcoming,
  isRegistrationOpen,
} from "@/lib/events";
import { EventStatus } from "@/generated/prisma/client";

const features = [
  {
    icon: "group",
    title: "Coach-side registration",
    description:
      "Register athletes once, then enter each event as a team. One submission, one payment for the whole chapter.",
  },
  {
    icon: "assignment_turned_in",
    title: "Paperless approvals",
    description:
      "Organizers approve chapters and payments in one queue. No more spreadsheets or receipts in your inbox.",
  },
  {
    icon: "emoji_events",
    title: "Live brackets",
    description:
      "Fair, random draws with instant result entry. Brackets and schedules update the moment a match ends.",
  },
];

async function getPublishedEvents() {
  return db.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    orderBy: { eventDate: "asc" },
  });
}

const getCachedPublishedEvents = unstable_cache(
  getPublishedEvents,
  ["landing-published-events"],
  { tags: ["events-published"] },
);

export default async function HomePage() {
  const user = await getCurrentUser();
  const authenticated = user !== null;
  const home = authenticated ? roleHome(user.role) : "/sign-in";

  const allEvents = await getCachedPublishedEvents();
  const upcomingEvents = allEvents
    .filter((e) => isEventUpcoming(e.eventDate))
    .slice(0, 6);

  return (
    <div
      className="bg-[#f2f2f2] text-navy-cool min-h-screen flex flex-col relative"
      style={{
        backgroundImage:
          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6efS3trwhCrV5AtGG0Y4ATFcN1Fuq0KqOwW97vA-lrR1UZdn9BP4_u7JtJOIH8HOZTz6NUgky-wNKhtcIqoBXp3pGrBAjde26ujdG7ajCNtw_g1WtCc1dMI3MFZ4bx0rTk2cNtUfoT90_oq8idg-IoKwLcE6ZyPCWvSoQGam7EkVLs73zgGwR93VNj_EZXDGvA-238pj2dsAG2Y2w552zhhhGFlF4jTi-LRKCu1gsCmq05XdGnrGryzEnkozfNsaN5A')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 z-0" />

      {/* Nav */}
      <nav className="relative z-20 w-full px-6 md:px-12 py-8 flex justify-between items-center text-white">
        <div className="flex justify-between items-center w-full max-w-[1600px] mx-auto">
          <Link
            className="flex items-center gap-2 text-xl font-bold text-white tracking-tight"
            href="/"
          >
            <span className="material-symbols-outlined text-action-redwood">
              sports_martial_arts
            </span>
            TKD ARENA
          </Link>

          <div className="flex items-center gap-4">
            {authenticated ? (
              <Link
                href={home}
                className="hidden md:block text-sm font-semibold text-white/80 hover:text-white transition-colors px-4 py-2"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden md:block text-sm font-semibold text-white/80 hover:text-white transition-colors px-4 py-2"
                >
                  Log In
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-white text-navy-cool text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-white/90 transition-colors"
                >
                  Signup
                </Link>
              </>
            )}
            <button className="md:hidden text-white">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex-grow flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-[1400px] min-h-[600px] rounded-lg overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col p-8 md:p-16 lg:p-24">
          <main className="relative z-10 flex flex-col justify-center w-full lg:w-8/12 max-w-4xl h-full">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight drop-shadow-md">
                <span className="text-white">Taekwondo</span>
                <br />
                <span className="font-medium text-[#ef4444]">
                  Tournament Manager.
                </span>
              </h1>
              <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-2xl drop-shadow-sm text-white">
                Chapter coaches register teams and pay once. Organizers approve,
                draw brackets, and report results live. No public access —
                coaches and organizers only.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                {authenticated ? (
                  <Link
                    href={home}
                    className="bg-action-redwood text-white text-sm font-semibold px-8 py-4 rounded-full hover:bg-tertiary-container transition-colors shadow-lg shadow-action-redwood/30 flex items-center justify-center gap-2"
                  >
                    Open Dashboard
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="bg-action-redwood text-white text-sm font-semibold px-8 py-4 rounded-full hover:bg-tertiary-container transition-colors shadow-lg shadow-action-redwood/30 flex items-center justify-center gap-2"
                  >
                    Get Started
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Features */}
      <section className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-12 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-lg flex flex-col gap-4"
            >
              <div className="text-action-redwood">
                <span className="material-symbols-outlined text-[36px]">
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-white text-xl font-semibold">
                {feature.title}
              </h3>
              <p className="text-surface-macadamia leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-12 py-16">
          <h2 className="text-2xl font-bold text-white mb-8">Upcoming Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden flex flex-col"
              >
                {event.imageUrl ? (
                  <div className="relative h-40 w-full">
                    <Image
                      src={event.imageUrl}
                      alt={event.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-white font-semibold text-lg">{event.name}</h3>
                  <div className="mt-3 space-y-2 text-sm text-surface-macadamia">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0" />
                      {formatDate(event.eventDate)}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0" />
                      {event.location}
                    </p>
                    <p className="flex items-center gap-2">
                      <Tag className="size-4 shrink-0" />
                      {formatPesos(event.entryFeePesos)} per athlete
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-surface-macadamia/70">
                    Registration closes {formatDeadline(event.registrationDeadline)}
                  </p>
                  <div className="mt-auto pt-4">
                    {isRegistrationOpen(event.registrationDeadline) ? (
                      <Link
                        href={authenticated ? `/dashboard/events/${event.id}` : "/sign-in"}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-action-redwood hover:text-action-redwood/80 transition-colors"
                      >
                        Register
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-surface-macadamia/50">
                        Registration closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {allEvents.filter((e) => isEventUpcoming(e.eventDate)).length > 6 && (
            <div className="mt-8 text-center">
              <Link
                href={authenticated ? home : "/sign-in"}
                className="text-sm font-semibold text-white/70 hover:text-white transition-colors"
              >
                {authenticated ? "View all events →" : "Log in to see all events →"}
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-20 w-full py-8 px-6 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-[1280px] mx-auto w-full opacity-70 hover:opacity-100 transition-opacity text-white">
          <p className="text-xs tracking-wider uppercase">
            &copy; 2026 TKD ARENA Taekwondo Systems
          </p>
          <div className="flex gap-6">
            <a
              className="text-xs hover:text-white/80 hover:underline transition-all uppercase tracking-wider"
              href="#"
            >
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
