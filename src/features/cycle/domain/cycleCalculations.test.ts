import { describe, expect, it } from "vitest";
import type { CycleEntry } from "../../../types";
import {
  averageCycleLength,
  detectIrregularity,
  filterValidCycles,
  getCalendarDayInfo,
  getCycleDay,
  predictCycle
} from "./cycleCalculations";

const cycle = (startDate: string, cycleLength?: number, periodLength = 5): CycleEntry => ({
  id: startDate,
  startDate,
  endDate: startDate,
  cycleLength,
  periodLength,
  source: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
});

describe("cycle calculations", () => {
  it("calculates cycle day", () => {
    expect(getCycleDay([cycle("2026-07-01")], new Date("2026-07-12T12:00:00"))).toBe(12);
  });

  it("calculates average length from history", () => {
    expect(averageCycleLength([cycle("2026-01-01"), cycle("2026-01-29"), cycle("2026-02-27")])).toBe(29);
  });

  it("handles month boundary", () => {
    const result = predictCycle([cycle("2026-01-30", 28)], new Date("2026-02-02T12:00:00"));
    expect(result.cycleDay).toBe(4);
  });

  it("handles year boundary", () => {
    const result = predictCycle([cycle("2025-12-28", 28)], new Date("2026-01-02T12:00:00"));
    expect(result.cycleDay).toBe(6);
  });

  it("handles leap year", () => {
    const result = predictCycle([cycle("2024-02-28", 28)], new Date("2024-02-29T12:00:00"));
    expect(result.cycleDay).toBe(2);
  });

  it("predicts next period and ovulation", () => {
    const result = predictCycle([cycle("2026-07-01", 28)], new Date("2026-07-14T12:00:00"));
    expect(result.predictedNextPeriodStart).toBe("2026-07-29");
    expect(result.predictedOvulationDate).toBe("2026-07-15");
    expect(result.fertileWindowStart).toBe("2026-07-10");
    expect(result.fertileWindowEnd).toBe("2026-07-16");
  });

  it("exposes future projected periods to the calendar", () => {
    const cycles = [cycle("2026-07-14")];
    expect(getCalendarDayInfo("2026-09-08", cycles, 28, 5, new Date("2026-07-14T12:00:00")).isPredictedPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-08-25", cycles, 28, 5, new Date("2026-07-14T12:00:00")).isOvulation).toBe(true);
  });

  it("keeps overdue expectation out of factual cycle day calculation", () => {
    const result = predictCycle([cycle("2026-07-14")], new Date("2026-08-12T12:00:00"), 28, 5);
    expect(result.pendingExpectation?.currentShiftedStart).toBe("2026-08-12");
    expect(result.pendingExpectation?.daysDelayed).toBe(1);
    expect(result.cycleDay).toBe(30);
  });

  it("marks ovulation as separate phase", () => {
    const result = predictCycle([cycle("2026-07-01", 28)], new Date("2026-07-15T12:00:00"));
    expect(result.currentPhase).toBe("ovulation");
  });

  it("filters corrupted values", () => {
    expect(filterValidCycles([cycle("2026-01-01", 120), cycle("2026-02-01", 30)])).toHaveLength(1);
  });

  it("detects irregular cycle", () => {
    expect(detectIrregularity([cycle("2026-01-01"), cycle("2026-01-25"), cycle("2026-03-01"), cycle("2026-03-27")])).toBe(true);
  });

  it("handles no history", () => {
    expect(predictCycle([], new Date("2026-07-14T12:00:00")).dataConfidence).toBe("low");
  });

  it("handles one cycle", () => {
    expect(predictCycle([cycle("2026-07-01")], new Date("2026-07-14T12:00:00")).dataConfidence).toBe("low");
  });

  it("uses recent six cycles", () => {
    const cycles = ["2026-01-01", "2026-01-30", "2026-02-27", "2026-03-27", "2026-04-24", "2026-05-22", "2026-06-19"].map((date) => cycle(date));
    expect(averageCycleLength(cycles)).toBe(28);
  });
});
