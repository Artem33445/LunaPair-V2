import { useEffect } from "react";

export function VisualEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(hover: none)").matches;
    if (reduced || touch) return;

    let frame = 0;
    const move = (event: MouseEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
      });
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  return null;
}
