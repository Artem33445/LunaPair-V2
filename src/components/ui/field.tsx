import * as Label from "@radix-ui/react-label";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <Label.Root htmlFor={htmlFor} className="text-sm font-semibold text-text">
      {children}
    </Label.Root>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-2xl border border-border bg-card px-4 py-2 text-base text-text placeholder:text-muted",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-base text-text placeholder:text-muted",
        className
      )}
      {...props}
    />
  );
}
