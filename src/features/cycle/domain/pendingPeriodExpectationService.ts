import type { PendingPeriodExpectation } from "../../../types";
import {
  differenceInCalendarDaysSafe,
  formatLocalDate
} from "./dateUtils";

export function calculatePendingPeriodExpectation(
  originalPredictedStart: string,
  generatedAt: Date
): PendingPeriodExpectation {
  const today = formatLocalDate(generatedAt);
  const daysDelayed = Math.max(0, differenceInCalendarDaysSafe(today, originalPredictedStart));

  return {
    originalPredictedStart,
    currentShiftedStart: daysDelayed > 0 ? today : originalPredictedStart,
    daysDelayed,
    active: today >= originalPredictedStart
  };
}
