import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppProfile, CycleEntry, DailyLog, PersonalAdvicePackage, PredictionResult } from "../types";

const mocks = vi.hoisted(() => {
  let savedAdvice: PersonalAdvicePackage | undefined;
  return {
    generateStructuredAdvice: vi.fn(),
    repository: {
      getLatest: vi.fn(() => Promise.resolve(savedAdvice)),
      save: vi.fn((advice: PersonalAdvicePackage) => {
        savedAdvice = advice;
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        savedAdvice = undefined;
        return Promise.resolve();
      })
    },
    getSavedAdvice: () => savedAdvice,
    setSavedAdvice: (advice: PersonalAdvicePackage | undefined) => {
      savedAdvice = advice;
    }
  };
});

vi.mock("../db/repositories", () => ({
  getRepositories: vi.fn(() => ({
    advice: mocks.repository
  }))
}));

vi.mock("./aiService", () => ({
  generateStructuredAdvice: mocks.generateStructuredAdvice
}));

const profile: AppProfile = {
  id: "profile-1",
  role: "tracker",
  name: "Анна",
  averageCycleLength: 29,
  averagePeriodLength: 5,
  theme: "dark",
  onboardingCompleted: true,
  partnerSharing: {
    shareCurrentCycleDay: true,
    shareCurrentPhase: true,
    sharePredictedPeriod: true,
    sharePredictionRange: true,
    shareCalendar: true,
    shareConfirmedPeriodDays: true,
    sharePredictedPeriodDays: true,
    shareFertileWindow: true,
    shareOvulationPrediction: true,
    shareDailyWellbeing: true,
    shareMood: true,
    shareEnergy: true,
    shareSleep: true,
    sharePainLevel: true,
    shareSymptoms: true,
    shareDischarge: true,
    shareDayNotes: false,
    sharePrivateMarkers: false,
    shareIntimacy: false,
    shareCycleHistory: true,
    shareStatistics: true,
    shareReports: true,
    shareSupportPreferences: true,
    accessLevel: "full",
    accessPaused: false,
    partnerDisconnected: false,
    updatedAt: "2026-08-16T00:00:00.000Z"
  },
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z"
};

const cycles: CycleEntry[] = [
  {
    id: "cycle-1",
    startDate: "2026-07-20",
    endDate: "2026-07-24",
    cycleLength: 29,
    periodLength: 5,
    source: "user",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z"
  }
];

const dailyLogs: DailyLog[] = [
  {
    id: "log-1",
    date: "2026-08-16",
    mood: "tired",
    energyLevel: "low",
    painLevel: 3,
    symptoms: ["усталость"],
    sleepQuality: "bad",
    sleepHours: 5,
    note: "Очень личная заметка",
    source: "user",
    createdAt: "2026-08-16T08:00:00.000Z",
    updatedAt: "2026-08-16T08:00:00.000Z"
  }
];

const prediction: PredictionResult = {
  cycleDay: 28,
  currentPhase: "luteal",
  predictedNextPeriodStart: "2026-08-18",
  predictedPeriodEnd: "2026-08-22",
  uncertaintyStart: "2026-08-16",
  uncertaintyEnd: "2026-08-20",
  predictedOvulationDate: "2026-08-04",
  fertileWindowStart: "2026-07-30",
  fertileWindowEnd: "2026-08-05",
  averageCycleLength: 29,
  averagePeriodLength: 5,
  irregularityDetected: false,
  dataConfidence: "medium",
  futureProjections: []
};

describe("personal advice service", () => {
  beforeEach(() => {
    mocks.setSavedAdvice(undefined);
    mocks.repository.getLatest.mockClear();
    mocks.repository.save.mockClear();
    mocks.generateStructuredAdvice.mockReset();
  });

  it("generates one structured package, validates it and saves it", async () => {
    const { getPersonalAdvice } = await import("./adviceService");
    mocks.generateStructuredAdvice.mockResolvedValue({
      summary: "Сегодня лучше держать мягкий темп.",
      tips: [
        { title: "Сон", text: "Добавь короткую паузу, если усталость держится.", category: "sleep" },
        { title: "Запись", text: "Отметь энергию и сон, чтобы видеть повторяющиеся паттерны.", category: "journal" },
        { title: "Цикл", text: "По расчетам приложения месячные могут начаться скоро.", category: "cycle" }
      ]
    });

    const result = await getPersonalAdvice({ profile, cycles, dailyLogs, prediction, uid: "user-1" });

    expect(result.fromCache).toBe(false);
    expect(result.advice.source).toBe("ai");
    expect(result.advice.tips).toHaveLength(3);
    expect(mocks.repository.save).toHaveBeenCalledOnce();
    expect(mocks.generateStructuredAdvice).toHaveBeenCalledOnce();
  }, 15000);

  it("sends only minimal context and excludes identifiers, name, key and notes", async () => {
    const { getPersonalAdvice } = await import("./adviceService");
    mocks.generateStructuredAdvice.mockResolvedValue({
      summary: "Советы готовы.",
      tips: [
        { title: "Отдых", text: "Поставь маленькую паузу в день.", category: "rest" },
        { title: "Вода", text: "Держи воду рядом.", category: "hydration" },
        { title: "Дневник", text: "Запиши симптом без самодиагностики.", category: "journal" }
      ]
    });

    await getPersonalAdvice({ profile, cycles, dailyLogs, prediction, uid: "user-1" });

    const context = mocks.generateStructuredAdvice.mock.calls[0][0];
    expect(JSON.stringify(context)).not.toContain("Анна");
    expect(JSON.stringify(context)).not.toContain("secret-key");
    expect(JSON.stringify(context)).not.toContain("profile-1");
    expect(JSON.stringify(context)).not.toContain("log-1");
    expect(JSON.stringify(context)).not.toContain("Очень личная заметка");
    expect(context.recentLogs[0]).toMatchObject({
      mood: "tired",
      energyLevel: "low",
      symptoms: ["усталость"],
      sleepQuality: "bad"
    });
  });

  it("returns cached advice for the same fresh context without a second AI call", async () => {
    const { getPersonalAdvice } = await import("./adviceService");
    mocks.generateStructuredAdvice.mockResolvedValue({
      summary: "Советы готовы.",
      tips: [
        { title: "Отдых", text: "Поставь маленькую паузу в день.", category: "rest" },
        { title: "Вода", text: "Держи воду рядом.", category: "hydration" },
        { title: "Дневник", text: "Запиши симптом без самодиагностики.", category: "journal" }
      ]
    });

    const first = await getPersonalAdvice({ profile, cycles, dailyLogs, prediction, uid: "user-1" });
    const second = await getPersonalAdvice({ profile, cycles, dailyLogs, prediction, uid: "user-1" });

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(second.advice.id).toBe(first.advice.id);
    expect(mocks.generateStructuredAdvice).toHaveBeenCalledOnce();
  });

  it("falls back safely when AI output is invalid", async () => {
    const { getPersonalAdvice } = await import("./adviceService");
    mocks.generateStructuredAdvice.mockResolvedValue({
      summary: "Слишком мало",
      tips: [{ title: "Один", text: "Недостаточно советов.", category: "rest" }]
    });

    const result = await getPersonalAdvice({ profile, cycles, dailyLogs, prediction, uid: "user-1" });

    expect(result.advice.source).toBe("fallback");
    expect(result.fallbackReason).toBe("invalid-ai-output");
    expect(result.advice.tips.length).toBeGreaterThanOrEqual(3);
  });
});
