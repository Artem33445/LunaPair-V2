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

    const createClickRipple = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("button, a, input, select, textarea, label, [role='button'], [data-click-ripple='off']")) {
        return;
      }

      const ripple = document.createElement("span");
      ripple.className = "app-click-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      document.body.appendChild(ripple);
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", createClickRipple);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", createClickRipple);
    };
  }, []);

  return null;
}
