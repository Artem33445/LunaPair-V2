import * as ToastPrimitive from "@radix-ui/react-toast";
import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";

export function AppToast() {
  const toast = useAppStore((state) => state.toast);
  const dismiss = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast]);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root
        open={Boolean(toast)}
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
        className="fixed bottom-[calc(var(--mobile-nav-height)+var(--safe-bottom)+0.75rem)] left-4 right-4 z-50 rounded-2xl border border-border bg-card p-4 text-sm font-semibold text-text shadow-soft md:left-auto md:right-6 md:top-6 md:bottom-auto md:w-96"
      >
        <ToastPrimitive.Description aria-live="polite">{toast}</ToastPrimitive.Description>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
}
