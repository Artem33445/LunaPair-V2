import { useEffect } from "react";

function distanceToAction(pointX: number, pointY: number, rect: DOMRect) {
  return Math.hypot(
    Math.max(rect.left - pointX, 0, pointX - rect.right),
    Math.max(rect.top - pointY, 0, pointY - rect.bottom)
  );
}

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
        const distance = distanceToAction(event.clientX, event.clientY, action.getBoundingClientRect());
        const closestDistance = closest ? distanceToAction(event.clientX, event.clientY, closest.getBoundingClientRect()) : Infinity;

        return distance < closestDistance ? action : closest;
      }, undefined);

      if (!nearbyAction) return;

      const actionRect = nearbyAction.getBoundingClientRect();
      const actionDistance = distanceToAction(event.clientX, event.clientY, actionRect);

      if (actionDistance > 160) return;

      const actionCenterX = actionRect.left + actionRect.width / 2;
      const actionCenterY = actionRect.top + actionRect.height / 2;
      const directionLength = Math.hypot(actionCenterX - event.clientX, actionCenterY - event.clientY) || 1;
      nearbyAction.style.setProperty("--nearby-nudge-x", `${((actionCenterX - event.clientX) / directionLength) * 1}px`);
      nearbyAction.style.setProperty("--nearby-nudge-y", `${((actionCenterY - event.clientY) / directionLength) * 1}px`);

      nearbyAction.classList.remove("app-nearby-action-pulse");
      void nearbyAction.offsetWidth;
      nearbyAction.classList.add("app-nearby-action-pulse");
      nearbyAction.addEventListener("animationend", () => {
        nearbyAction.classList.remove("app-nearby-action-pulse");
        nearbyAction.style.removeProperty("--nearby-nudge-x");
        nearbyAction.style.removeProperty("--nearby-nudge-y");
      }, { once: true });
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
