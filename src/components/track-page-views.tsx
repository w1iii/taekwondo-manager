"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires the page-view beacon on every client-side route change (and the first
 * paint). Uses sendBeacon when available so the request survives page unload;
 * fire-and-forget otherwise. Dedupes the initial mount so a hard navigation
 * to the landing route only records once.
 */
export function TrackPageViews() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastSent.current) return;
    lastSent.current = pathname;

    const body = JSON.stringify({ path: pathname });
    try {
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/analytics/view", body);
      } else {
        void fetch("/api/analytics/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Never let analytics break navigation.
    }
  }, [pathname]);

  return null;
}