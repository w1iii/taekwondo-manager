"use client";

import { useState } from "react";
import { Building2, MapPin, Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PROVINCES } from "@/lib/provinces";

export type ChapterSummary = {
  id: string;
  name: string;
  province: string;
  city: string;
  logoUrl: string | null;
  headCoachName: string;
};

export function ChapterDirectory({ chapters }: { chapters: ChapterSummary[] }) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");

  const filtered = chapters.filter((c) => {
    const matchesQuery =
      query.trim() === "" ||
      c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      c.city.toLowerCase().includes(query.trim().toLowerCase());
    const matchesProvince = province === "" || c.province === province;
    return matchesQuery && matchesProvince;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by chapter or city"
            className="pl-8"
          />
        </div>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          aria-label="Filter by province"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56"
        >
          <option value="">All provinces</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No chapters match your filters.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
            >
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logoUrl}
                  alt={`${c.name} logo`}
                  className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                />
              ) : (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {c.city}, {c.province}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  Head coach: {c.headCoachName}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}