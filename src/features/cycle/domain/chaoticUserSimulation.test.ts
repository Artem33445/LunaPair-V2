import { describe, expect, it, beforeEach } from "vitest";
import { getCalendarDayInfo, predictCycle } from "./cycleCalculations";
import { useAppStore } from "../../../stores/appStore";
import type { AppProfile, CycleEntry } from "../../../types";

describe("Chaotic User Actions Simulation (Period Management & Error Handling)", () => {
  beforeEach(async () => {
    // Reset store state with a standard tracker profile and initial registration cycle
    const profile: AppProfile = {
      id: "test-profile",
      role: "tracker",
      name: "Тестовая Пользовательница",
      averageCycleLength: 28,
      averagePeriodLength: 5,
      theme: "light",
      onboardingCompleted: true,
      partnerSharing: {
        shareCurrentCycleDay: true,
        shareCurrentPhase: true,
        sharePredictedPeriod: true,
        sharePredictionRange: true,
        shareCalendar: true,
        shareConfirmedPeriodDays: true
      },
      hidePrivateMarkers: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };

    const initialCycle: CycleEntry = {
      id: "cycle-reg-001",
      startDate: "2026-08-10",
      endDate: "2026-08-14",
      periodLength: 5,
      cycleLength: 28,
      source: "user",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };

    useAppStore.setState({
      profile,
      cycles: [initialCycle],
      dailyLogs: [],
      toast: undefined
    });
  });

  it("cleans up old registration red days when user updates period start date", async () => {
    const store = useAppStore.getState();

    // Initial state: August 10-14 should be actual period
    expect(getCalendarDayInfo("2026-08-10", store.cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-08-14", store.cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-08-15", store.cycles, 28, 5).isActualPeriod).toBe(false);

    // User moves the period to September 01 (e.g. realizing they entered wrong date at registration)
    await store.updatePeriodStartDate("2026-09-01", "cycle-reg-001");

    const updatedCycles = useAppStore.getState().cycles;
    expect(updatedCycles.length).toBe(1);
    expect(updatedCycles[0].startDate).toBe("2026-09-01");
    expect(updatedCycles[0].endDate).toBe("2026-09-05");
    expect(updatedCycles[0].periodLength).toBe(5);

    // CRITICAL REQUIREMENT: Old registration days (Aug 10-14) MUST NOT be red anymore!
    expect(getCalendarDayInfo("2026-08-10", updatedCycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-08-11", updatedCycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-08-12", updatedCycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-08-13", updatedCycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-08-14", updatedCycles, 28, 5).isActualPeriod).toBe(false);

    // ONLY new days (Sept 01-05) must be red!
    expect(getCalendarDayInfo("2026-09-01", updatedCycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-05", updatedCycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-06", updatedCycles, 28, 5).isActualPeriod).toBe(false);
  });

  it("handles early period completion ('Месячные закончились') and stops red days immediately", async () => {
    const store = useAppStore.getState();

    // Start a period on September 05 (planned 5 days until Sept 09)
    await store.updatePeriodStartDate("2026-09-05");
    let cycles = useAppStore.getState().cycles;
    expect(getCalendarDayInfo("2026-09-07", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-08", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-09", cycles, 28, 5).isActualPeriod).toBe(true);

    // Period finished early on September 07 (3 days total)
    await store.endPeriod("2026-09-07");
    cycles = useAppStore.getState().cycles;

    const target = cycles.find((c) => c.startDate === "2026-09-05");
    expect(target).toBeDefined();
    expect(target?.endDate).toBe("2026-09-07");
    expect(target?.periodLength).toBe(3);

    // Sept 05, 06, 07 are red
    expect(getCalendarDayInfo("2026-09-05", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-06", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-07", cycles, 28, 5).isActualPeriod).toBe(true);

    // Sept 08 and 09 MUST NO LONGER be red!
    expect(getCalendarDayInfo("2026-09-08", cycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-09-09", cycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-09-08", cycles, 28, 5).phase).toBe("follicular");
  });

  it("safely handles chaotic rapid clicks and conflicting duplicate entries", async () => {
    const store = useAppStore.getState();

    // 1. Chaotic rapid startPeriod clicks on nearby days
    await store.startPeriod("2026-09-01");
    await store.startPeriod("2026-09-02");
    await store.startPeriod("2026-09-03");

    // Nearby cycles within 21 days should be reconciled to the latest, not creating 3 overlapping cycles
    let cycles = useAppStore.getState().cycles;
    const septemberCycles = cycles.filter((c) => c.startDate.startsWith("2026-09"));
    expect(septemberCycles.length).toBe(1);
    expect(septemberCycles[0].startDate).toBe("2026-09-03");

    // 2. Chaotic updates with invalid date strings
    await store.updatePeriodStartDate("");
    await store.updatePeriodStartDate("not-a-date");
    await store.updatePeriodStartDate("2026-99-99");
    // Cycles should remain safe and untouched
    expect(useAppStore.getState().cycles.length).toBe(cycles.length);

    // 3. Chaotic endPeriod before startDate
    await store.endPeriod("2026-09-01", septemberCycles[0].id);
    // Should show error and NOT corrupt cycle
    expect(useAppStore.getState().toast).toContain("раньше");
    expect(useAppStore.getState().cycles.find((c) => c.id === septemberCycles[0].id)?.endDate).toBe("2026-09-07");

    // 4. End period on exact start date (1-day period)
    await store.endPeriod("2026-09-03", septemberCycles[0].id);
    const oneDayCycle = useAppStore.getState().cycles.find((c) => c.id === septemberCycles[0].id);
    expect(oneDayCycle?.endDate).toBe("2026-09-03");
    expect(oneDayCycle?.periodLength).toBe(1);
    expect(getCalendarDayInfo("2026-09-03", useAppStore.getState().cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-04", useAppStore.getState().cycles, 28, 5).isActualPeriod).toBe(false);

    // 5. Jump back and forth: change date to future month, then past month
    await store.updatePeriodStartDate("2026-11-15");
    await store.updatePeriodStartDate("2026-07-20");

    cycles = useAppStore.getState().cycles;
    // Prediction must compute seamlessly without NaN or crash
    const prediction = predictCycle(cycles, new Date("2026-09-10"), 28, 5);
    expect(prediction.cycleDay).toBeGreaterThan(0);
    expect(prediction.predictedNextPeriodStart).toBeDefined();
    expect(prediction.futureProjections.length).toBeGreaterThan(0);
  });

  it("handles empty cycles list gracefully", async () => {
    useAppStore.setState({ cycles: [] });
    const store = useAppStore.getState();

    // Ending period when no cycles exist
    await store.endPeriod("2026-09-10");
    expect(useAppStore.getState().toast).toContain("Сначала отметь начало");

    // Prediction with 0 cycles
    const prediction = predictCycle([], new Date(), 28, 5);
    expect(prediction.cycleDay).toBe(1);
    expect(prediction.currentPhase).toBeDefined();

    // Calendar day info with 0 cycles
    const info = getCalendarDayInfo("2026-09-10", [], 28, 5);
    expect(info.isActualPeriod).toBe(false);
    expect(info.isPredictedPeriod).toBeDefined();
  });
});
