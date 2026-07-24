import { describe, expect, it } from "vitest";
import type { DailyLog, PartnerSharingPreferences } from "../../../types";
import { filterPartnerLog } from "./filterPartnerData";

const log: DailyLog = {
  id: "1",
  date: "2026-07-14",
  mood: "happy",
  energy: 7,
  energyLevel: "high",
  sleepQuality: "good",
  sleepHours: 8,
  pain: 4,
  flow: "medium",
  symptoms: ["сонливость"],
  note: "личная заметка",
  noteVisibleToPartner: true,
  intimacy: { occurred: true, note: "приватная заметка" },
  source: "user",
  createdAt: "",
  updatedAt: ""
};

const permissions: PartnerSharingPreferences = {
  shareCurrentCycleDay: true,
  shareCurrentPhase: true,
  sharePredictedPeriod: true,
  sharePredictionRange: true,
  shareCalendar: true,
  shareConfirmedPeriodDays: true,
  sharePredictedPeriodDays: true,
  shareFertileWindow: false,
  shareOvulationPrediction: false,
  shareDailyWellbeing: false,
  shareMood: true,
  shareEnergy: false,
  shareSleep: false,
  sharePainLevel: false,
  shareSymptoms: false,
  shareDischarge: false,
  shareDayNotes: false,
  sharePrivateMarkers: false,
  shareIntimacy: false,
  shareCycleHistory: false,
  shareStatistics: false,
  shareReports: false,
  shareSupportPreferences: true,
  accessLevel: "custom",
  accessPaused: false,
  partnerDisconnected: false,
  updatedAt: ""
};

describe("partner permissions", () => {
  it("hides closed categories", () => {
    const filtered = filterPartnerLog(log, permissions);
    expect(filtered.mood).toBe("happy");
    expect(filtered.symptoms).toEqual([]);
    expect(filtered.note).toBeUndefined();
    expect(filtered.pain).toBeUndefined();
    expect(filtered.intimacy).toBeUndefined();
    expect(filtered.energyLevel).toBeUndefined();
    expect(filtered.sleepHours).toBeUndefined();
  });
});
