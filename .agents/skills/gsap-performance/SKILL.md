---
name: gsap-performance
description: Official GSAP skill for performance — prefer transforms, avoid layout thrashing, will-change, batching, and quickTo. Use when optimizing GSAP animations, reducing jank, or optimizing animation FPS on mobile and desktop.
---

# GSAP Performance & Optimization Guide

This skill provides mandatory architectural patterns and performance optimizations when writing or refactoring GSAP animations in React/TypeScript applications.

---

## 1. Core Performance Principles

### A. Animate Only GPU-Accelerated Properties
* **Always animate:** `x`, `y`, `scale`, `scaleX`, `scaleY`, `rotation`, `skewX`, `skewY`, `opacity`.
* **Never animate properties that cause Layout / Reflow:** `top`, `left`, `right`, `bottom`, `width`, `height`, `margin`, `padding`, `border-width`.
* **Never animate Paint-only properties unnecessarily:** `box-shadow` or `filter: blur()` during high-frequency animations (prefer pre-rendered layers or opacity fades of pseudo-elements).

```typescript
// ❌ BAD: Triggers Layout & Reflow on every frame
gsap.to(".card", { top: 100, left: 50, width: 300 });

// ✅ GOOD: 100% GPU compositor thread
gsap.to(".card", { x: 50, y: 100, scale: 1.2, force3D: true });
```

---

### B. Use `gsap.quickTo()` for High-Frequency Events (Mouse / Pointer)
When tracking mouse movement, cursor position, or scroll deltas, **never** create new tweens with `gsap.to()` on every tick. Use `gsap.quickTo()`.

```typescript
// ✅ BEST PRACTICE: Reusable quickTo pipelines
const xTo = gsap.quickTo(cardRef.current, "x", { duration: 0.4, ease: "power3" });
const yTo = gsap.quickTo(cardRef.current, "y", { duration: 0.4, ease: "power3" });

const onMouseMove = (e: MouseEvent) => {
  xTo(e.clientX - centerX);
  yTo(e.clientY - centerY);
};
```

---

### C. Avoid Layout Thrashing (Batching DOM Reads & Writes)
* **Never** call `getBoundingClientRect()`, `offsetWidth`, `offsetHeight`, or `computedStyle` inside requestAnimationFrame loops, `onUpdate`, or raw mousemove handlers.
* Read DOM dimensions once on `resize` / `mount` / `mouseenter` and cache the values.

```typescript
// ❌ BAD: Layout Thrashing on every mousemove event
const handleMouseMove = (e: MouseEvent) => {
  const rect = element.getBoundingClientRect(); // Triggers synchronous layout calculation!
  gsap.to(element, { x: e.clientX - rect.left });
};

// ✅ GOOD: Cache rect on enter / resize
let cachedRect: DOMRect | null = null;

const handleMouseEnter = () => {
  cachedRect = element.getBoundingClientRect();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!cachedRect) return;
  const relX = e.clientX - cachedRect.left;
  xTo(relX);
};
```

---

### D. Hardware Acceleration & `will-change`
* Apply `will-change: transform;` only while elements are active or animating, or on key interactive elements.
* Ensure GSAP enables 3D GPU layers with `force3D: true` (GSAP default for transforms).

---

## 2. React Lifecycle & Memory Cleanup

GSAP animations and event listeners created in React components must be cleaned up to prevent memory leaks and ghost updates.

```typescript
useEffect(() => {
  const ctx = gsap.context(() => {
    // All animations and ScrollTriggers created here will be cleanly reverted
    gsap.to(".item", { opacity: 1, y: 0, stagger: 0.05 });
  }, containerRef);

  return () => ctx.revert(); // Reverts DOM state and kills all tweens & listeners
}, []);
```

---

## 3. Mobile Optimization & Device Detection

* **Disable heavy multi-element particle/tilt animations on mobile devices** (under 768px).
* Use `pointer: fine` or `window.innerWidth > 768` to conditionally activate mouse tracking, spotlight, and particle canvas effects.
* Limit maximum active concurrent tweens to avoid battery drain and throttling on mobile WebKit.
