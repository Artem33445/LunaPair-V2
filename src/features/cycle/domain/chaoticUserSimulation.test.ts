import { describe, expect, it, beforeEach } from "vitest";
import { getCalendarDayInfo, predictCycle } from "./cycleCalculations";
import { useAppStore } from "../../../stores/appStore";
import type { AppProfile, CycleEntry } from "../../../types";
import { defaultSharing } from "./demoData";

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
      partnerSharing: defaultSharing,
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

  it("exact user scenario: period started on 7th, ends on 10th -> days 7, 8, 9, 10 are ALL red, and cycle counts from 7th", async () => {
    const store = useAppStore.getState();

    // 1. User sets start date to 7th (planned 5 days: 7th to 11th)
    await store.updatePeriodStartDate("2026-09-07");
    let cycles = useAppStore.getState().cycles;
    expect(cycles[0].startDate).toBe("2026-09-07");
    expect(cycles[0].endDate).toBe("2026-09-11");

    // 2. User marks that period ended on 10th
    await store.endPeriod("2026-09-10", cycles[0].id);
    cycles = useAppStore.getState().cycles;

    const cycle = cycles[0];
    expect(cycle.startDate).toBe("2026-09-07");
    expect(cycle.endDate).toBe("2026-09-10");
    expect(cycle.periodLength).toBe(4);

    // 3. Days 7, 8, 9, 10 MUST ALL BE RED
    expect(getCalendarDayInfo("2026-09-07", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-08", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-09", cycles, 28, 5).isActualPeriod).toBe(true);
    expect(getCalendarDayInfo("2026-09-10", cycles, 28, 5).isActualPeriod).toBe(true);

    // 4. Day 11 must NOT be red
    expect(getCalendarDayInfo("2026-09-11", cycles, 28, 5).isActualPeriod).toBe(false);
    expect(getCalendarDayInfo("2026-09-11", cycles, 28, 5).phase).toBe("follicular");

    // 5. Cycle day MUST count from the first day (7th), NOT from end (10th)
    expect(getCalendarDayInfo("2026-09-07", cycles, 28, 5).cycleDay).toBe(1);
    expect(getCalendarDayInfo("2026-09-08", cycles, 28, 5).cycleDay).toBe(2);
    expect(getCalendarDayInfo("2026-09-09", cycles, 28, 5).cycleDay).toBe(3);
    expect(getCalendarDayInfo("2026-09-10", cycles, 28, 5).cycleDay).toBe(4);
    expect(getCalendarDayInfo("2026-09-15", cycles, 28, 5).cycleDay).toBe(9); // 15 - 7 + 1 = 9

    // 6. Next cycle prediction is computed from the first day (7th + 28 = Oct 5), NOT from the end
    const prediction = predictCycle(cycles, new Date("2026-09-10T12:00:00"), 28, 5);
    expect(prediction.cycleDay).toBe(4);
    expect(prediction.predictedNextPeriodStart).toBe("2026-10-05");
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

  it("reproduces user issue: period started on 6th, ended on 9th -> circle and calendar must be synchronized", async () => {
    const store = useAppStore.getState();

    // 1. User sets start date to 6th (2026-09-06)
    await store.updatePeriodStartDate("2026-09-06");
    let cycles = useAppStore.getState().cycles;

    // 2. User marks that period ended on 9th (2026-09-09)
    await store.endPeriod("2026-09-09", cycles[0].id);
    cycles = useAppStore.getState().cycles;

    // 3. Calendar info for today (2026-09-10)
    const calToday = getCalendarDayInfo("2026-09-10", cycles, 28, 5);
    expect(calToday.cycleDay).toBe(5);
    expect(calToday.phase).toBe("follicular");
    expect(calToday.isActualPeriod).toBe(false);

    // 4. Circle prediction for today (2026-09-10) - MUST BE SYNCHRONIZED
    const predictionToday = predictCycle(cycles, new Date("2026-09-10T12:00:00"), 28, 5);
    expect(predictionToday.cycleDay).toBe(5);
    expect(predictionToday.currentPhase).toBe("follicular");

    // 5. Verify every single day from start of period through post-period
    const d6 = getCalendarDayInfo("2026-09-06", cycles, 28, 5);
    expect(d6.cycleDay).toBe(1);
    expect(d6.phase).toBe("menstrual");
    expect(d6.isActualPeriod).toBe(true);

    const d7 = getCalendarDayInfo("2026-09-07", cycles, 28, 5);
    expect(d7.cycleDay).toBe(2);
    expect(d7.phase).toBe("menstrual");
    expect(d7.isActualPeriod).toBe(true);

    const d8 = getCalendarDayInfo("2026-09-08", cycles, 28, 5);
    expect(d8.cycleDay).toBe(3);
    expect(d8.phase).toBe("menstrual");
    expect(d8.isActualPeriod).toBe(true);

    const d9 = getCalendarDayInfo("2026-09-09", cycles, 28, 5);
    expect(d9.cycleDay).toBe(4);
    expect(d9.phase).toBe("menstrual");
    expect(d9.isActualPeriod).toBe(true);

    const d10 = getCalendarDayInfo("2026-09-10", cycles, 28, 5);
    expect(d10.cycleDay).toBe(5);
    expect(d10.phase).toBe("follicular");
    expect(d10.isActualPeriod).toBe(false);

    // 6. Predict cycle on past day (Sept 6) evaluates to day 1 menstrual
    const pred6 = predictCycle(cycles, new Date("2026-09-06T12:00:00"), 28, 5);
    expect(pred6.cycleDay).toBe(1);
    expect(pred6.currentPhase).toBe("menstrual");

    // 7. Predict cycle on Sept 9 evaluates to day 4 menstrual
    const pred9 = predictCycle(cycles, new Date("2026-09-09T12:00:00"), 28, 5);
    expect(pred9.cycleDay).toBe(4);
    expect(pred9.currentPhase).toBe("menstrual");

    // 8. Predict cycle on Sept 10 evaluates to day 5 follicular
    const pred10 = predictCycle(cycles, new Date("2026-09-10T12:00:00"), 28, 5);
    expect(pred10.cycleDay).toBe(5);
    expect(pred10.currentPhase).toBe("follicular");
  });
});

