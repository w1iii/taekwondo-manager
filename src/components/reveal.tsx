"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fade/slide content in when it scrolls into view. Respects
 * `prefers-reduced-motion` and renders instantly if the IntersectionObserver
 * is unavailable.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let observer: IntersectionObserver | null = null;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // No observation needed; reveal on the next frame so the flash is
      // imperceptible without a synchronous setState inside the effect.
      frame = requestAnimationFrame(() => setShown(true));
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setShown(true);
              observer?.disconnect();
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
      observer.observe(node);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(16px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}