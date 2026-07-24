import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-card border border-border glass-panel p-4 shadow-soft sm:p-5", className)} {...props} />;
}
