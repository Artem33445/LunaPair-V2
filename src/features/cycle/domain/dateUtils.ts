import { addDays, differenceInCalendarDays, format, parse } from "date-fns";

export function parseLocalDate(date: string) {
  return parse(date, "yyyy-MM-dd", new Date(2000, 0, 1));
}

export function formatLocalDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function addCalendarDays(date: string, days: number) {
  return formatLocalDate(addDays(parseLocalDate(date), days));
}

export function differenceInCalendarDaysSafe(later: string, earlier: string) {
  return differenceInCalendarDays(parseLocalDate(later), parseLocalDate(earlier));
}
