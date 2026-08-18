"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `value` once it scrolls into view. Respects
 * `prefers-reduced-motion` (renders instantly) and `Intl`-formats the result.
 */
export function CountUp({
  value,
  duration = 900,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const instant =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof window.requestAnimationFrame !== "function" ||
      typeof IntersectionObserver === "undefined";

    let frame = 0;
    let observer: IntersectionObserver | null = null;

    const start = (t0: number) => {
      const tick = (now: number) => {
        const progress = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (instant) {
      frame = requestAnimationFrame(() => start(performance.now()));
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer?.disconnect();
            start(performance.now());
          }
        },
        { threshold: 0.4 },
      );
      observer.observe(node);
    }

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  const shown = format ? format(display) : String(display);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}