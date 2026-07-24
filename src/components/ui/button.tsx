import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-soft hover:brightness-105",
        secondary: "bg-primarySoft text-text hover:bg-primarySoft/80",
        outline: "border border-border bg-card text-text hover:bg-primarySoft",
        ghost: "text-text hover:bg-primarySoft hover:scale-[1.02]",
        danger: "bg-coral text-white hover:brightness-105"
      },
      size: {
        default: "min-h-11",
        icon: "h-11 w-11 p-0",
        lg: "min-h-12 px-5 text-base"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
