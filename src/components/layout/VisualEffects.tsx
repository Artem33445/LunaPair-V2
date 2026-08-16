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

      const nearbyAction = Array.from(
        document.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [role='button']:not([aria-disabled='true'])")
      ).reduce<HTMLElement | undefined>((closest, action) => {
        const rect = action.getBoundingClientRect();
        const horizontalDistance = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
        const verticalDistance = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
        const distance = Math.hypot(horizontalDistance, verticalDistance);
        const closestDistance = closest
          ? Math.hypot(
              Math.max(closest.getBoundingClientRect().left - event.clientX, 0, event.clientX - closest.getBoundingClientRect().right),
              Math.max(closest.getBoundingClientRect().top - event.clientY, 0, event.clientY - closest.getBoundingClientRect().bottom)
            )
          : Infinity;

        return distance < closestDistance ? action : closest;
      }, undefined);

      if (!nearbyAction) return;

      const actionRect = nearbyAction.getBoundingClientRect();
      const actionDistance = Math.hypot(
        Math.max(actionRect.left - event.clientX, 0, event.clientX - actionRect.right),
        Math.max(actionRect.top - event.clientY, 0, event.clientY - actionRect.bottom)
      );

      if (actionDistance > 160) return;

      nearbyAction.classList.remove("app-nearby-action-pulse");
      void nearbyAction.offsetWidth;
      nearbyAction.classList.add("app-nearby-action-pulse");
      nearbyAction.addEventListener("animationend", () => nearbyAction.classList.remove("app-nearby-action-pulse"), { once: true });
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
