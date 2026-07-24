import { describe, expect, it } from "vitest";
import type { CycleEntry } from "../../../types";
import { calculateCyclePrediction } from "./cyclePredictionService";
import { getCalendarDayInfo } from "./cycleCalculations";

const cycle = (startDate: string): CycleEntry => ({
  id: startDate,
  startDate,
  periodLength: 5,
  source: "user",
  createdAt: "",
  updatedAt: ""
});

describe("cycle prediction service", () => {
  it("uses last confirmed start and profile fallback without creating July 29 forecast", () => {
    const cycles = [cycle("2026-07-14")];
    const prediction = calculateCyclePrediction({
      cycles,
      fallbackCycleLength: 28,
      fallbackPeriodLength: 5,
      generatedAt: new Date("2026-07-14T12:00:00")
    });
    expect(prediction.predictedNextPeriodStart).toBe("2026-08-11");
    expect(getCalendarDayInfo("2026-07-29", cycles, 28, 5).isPredictedPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-08-11", cycles, 28, 5).isPredictedPeriod).toBe(true);
  });

  it("excludes suspicious one-day intervals from forecast", () => {
    const prediction = calculateCyclePrediction({
      cycles: [cycle("2026-07-14"), cycle("2026-07-15"), cycle("2026-08-11")],
      fallbackCycleLength: 28,
      fallbackPeriodLength: 5
    });
    expect(prediction.usedCycleLengths).toEqual([27]);
    expect(prediction.excludedSuspiciousStarts).toContain("2026-07-14");
  });

  it("builds six future projections without creating factual cycles", () => {
    const cycles = [cycle("2026-07-14")];
    const prediction = calculateCyclePrediction({
      cycles,
      fallbackCycleLength: 28,
      fallbackPeriodLength: 5,
      generatedAt: new Date("2026-07-14T12:00:00")
    });

    expect(prediction.futureProjections).toHaveLength(6);
    expect(prediction.futureProjections.map((projection) => projection.predictedStartDate).slice(0, 3)).toEqual([
      "2026-08-11",
      "2026-09-08",
      "2026-10-06"
    ]);
    expect(cycles).toHaveLength(1);
  });

  it("shifts an overdue expected start without treating it as confirmed", () => {
    const prediction = calculateCyclePrediction({
      cycles: [cycle("2026-07-14")],
      fallbackCycleLength: 28,
      fallbackPeriodLength: 5,
      generatedAt: new Date("2026-08-13T12:00:00")
    });

    expect(prediction.pendingExpectation).toEqual({
      originalPredictedStart: "2026-08-11",
      currentShiftedStart: "2026-08-13",
      daysDelayed: 2,
      active: true
    });
    expect(prediction.predictedNextPeriodStart).toBe("2026-08-13");
    expect(prediction.futureProjections[0].predictedStartDate).toBe("2026-08-13");
  });

  it("recalculates future projections from the confirmed actual start", () => {
    const prediction = calculateCyclePrediction({
      cycles: [cycle("2026-07-14"), cycle("2026-08-15")],
      fallbackCycleLength: 28,
      fallbackPeriodLength: 5,
      generatedAt: new Date("2026-08-15T12:00:00")
    });

    expect(prediction.basedOnLastConfirmedPeriodStart).toBe("2026-08-15");
    expect(prediction.usedCycleLengths).toEqual([32]);
    expect(prediction.predictedNextPeriodStart).not.toBe("2026-09-08");
  });
});
