import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatLocalDate } from "../features/cycle/domain/dateUtils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function id(prefix: string) {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

export function todayIso() {
  return formatLocalDate(new Date());
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
