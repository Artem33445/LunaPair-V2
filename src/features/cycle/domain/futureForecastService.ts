import type { DataConfidence, FutureCycleProjection } from "../../../types";
import { addCalendarDays } from "./dateUtils";

export interface BuildFutureCycleProjectionsInput {
  firstStartDate: string;
  periodLength: number;
  cycleLength: number;
  confidence: DataConfidence;
  count?: number;
}

export function buildFutureCycleProjections({
  firstStartDate,
  periodLength,
  cycleLength,
  confidence,
  count = 6
}: BuildFutureCycleProjectionsInput): FutureCycleProjection[] {
  return Array.from({ length: count }, (_, index) => {
    const predictedStartDate = addCalendarDays(firstStartDate, index * cycleLength);
    const predictedEndDate = addCalendarDays(predictedStartDate, Math.max(1, periodLength) - 1);
    const ovulationDate = addCalendarDays(predictedStartDate, -14);

    return {
      index: index + 1,
      predictedStartDate,
      predictedEndDate,
      fertileWindowStart: addCalendarDays(ovulationDate, -5),
      fertileWindowEnd: addCalendarDays(ovulationDate, 1),
      ovulationDate,
      basedOnCycleLength: cycleLength,
      confidence
    };
  });
}
