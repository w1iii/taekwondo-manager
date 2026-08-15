"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the server-rendered page so bracketed updates (winner recorded,
 * divisions drawn) show up without a manual reload. Uses Next's RSC refresh,
 * which only re-renders this route — no full page navigation. Pauses while the
 * tab is hidden and respects `prefers-reduced-motion`.
 */
export function LiveBracketsRefresh({
  intervalMs = 15000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const refresh = () => {
      // Skip when the tab isn't visible; refreshing hidden pages wastes requests.
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    timer.current = setInterval(refresh, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, router]);

  return null;
}