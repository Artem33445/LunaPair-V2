import { describe, expect, it } from "vitest";
import type { CycleEntry, DailyLog } from "../../../types";
import { buildCycleReport, buildReports, frequentSymptoms } from "./cycleReports";

const cycle = (id: string, startDate: string, endDate?: string, cycleLength = 28): CycleEntry => ({
  id,
  startDate,
  endDate,
  cycleLength,
  periodLength: 5,
  source: "user",
  createdAt: "",
  updatedAt: ""
});

const log = (date: string, painLevel: number, symptoms: string[] = ["спазмы"]): DailyLog => ({
  id: date,
  date,
  mood: "calm",
  symptoms,
  painLevel,
  intimacy: { occurred: true, type: "prefer-not-to-say" },
  source: "user",
  createdAt: "",
  updatedAt: ""
});

describe("cycle reports", () => {
  it("builds completed cycle report", () => {
    const report = buildCycleReport(cycle("1", "2026-01-01", "2026-01-05"), [
      log("2026-01-02", 2),
      log("2026-01-03", 4),
      log("2026-01-04", 6, ["усталость"])
    ]);
    expect(report.averagePain).toBe(4);
    expect(report.frequentMood).toBe("calm");
    expect(report.frequentSymptoms).toContain("спазмы");
    expect(report.insufficientData).toBe(false);
  });

  it("excludes logs outside cycle", () => {
    const report = buildCycleReport(cycle("1", "2026-01-01", "2026-01-05"), [
      log("2025-12-31", 10),
      log("2026-01-02", 2)
    ]);
    expect(report.logCount).toBe(1);
  });

  it("handles absence of history", () => {
    expect(buildReports([], [])).toEqual([]);
  });

  it("finds frequent symptom", () => {
    expect(frequentSymptoms([log("2026-01-01", 1), log("2026-01-02", 2), log("2026-01-03", 3, ["усталость"])]).at(0)).toBe("спазмы");
  });
});
