import { addDays, formatISO, subDays } from "date-fns";
import type { AppProfile, CycleEntry, DailyLog, PartnerSharingPreferences } from "../../../types";
import { id } from "../../../lib/utils";
import { createDefaultSharing } from "../../partner/domain/partnerPermissions";

const iso = (date: Date) => formatISO(date, { representation: "date" });

export const defaultSharing: PartnerSharingPreferences = createDefaultSharing();

export function createDemoData(now = new Date()) {
  const lengths = [28, 29, 27, 30, 28];
  const periodLengths = [5, 4, 6, 5, 5];
  const currentStart = subDays(now, 12);
  const starts: Date[] = [currentStart];

  for (let index = 1; index < lengths.length; index += 1) {
    starts.unshift(subDays(starts[0], lengths[index]));
  }

  const cycles: CycleEntry[] = starts.map((start, index) => {
    const periodLength = periodLengths[index] ?? 5;
    const next = starts[index + 1];
    return {
      id: id("cycle"),
      startDate: iso(start),
      endDate: index < starts.length - 1 ? iso(addDays(start, periodLength - 1)) : undefined,
      periodLength,
      cycleLength: next ? Math.round((next.getTime() - start.getTime()) / 86400000) : 28,
      source: "demo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const symptoms = ["спазмы", "чувствительность груди", "усталость", "изменения аппетита"];
  const moods = ["calm", "good", "sensitive", "tired", "changeable"] as const;
  const logs: DailyLog[] = Array.from({ length: 20 }, (_, index) => {
    const date = subDays(now, index * 2);
    return {
      id: id("log"),
      date: iso(date),
      mood: moods[index % moods.length],
      moodChangedDuringDay: index % 5 === 0,
      wellbeing: index % 4 === 0 ? "normal" : "good",
      energy: 4 + (index % 6),
      energyLevel: index % 3 === 0 ? "normal" : "high",
      pain: index % 5,
      painLevel: index % 5,
      flow: index < 3 ? "medium" : index % 7 === 0 ? "spotting" : "none",
      symptoms: index % 3 === 0 ? [symptoms[index % symptoms.length]] : [],
      sleepQuality: index % 4 === 0 ? "normal" : "good",
      sleepHours: 6 + (index % 4) * 0.5,
      intimacy:
        index % 8 === 0
          ? { occurred: true, type: "prefer-not-to-say", protection: "prefer-not-to-say" }
          : { occurred: null },
      note: index % 6 === 0 ? "Нужен спокойный вечер и больше воды." : undefined,
      noteVisibleToPartner: false,
      hiddenFromPartner: false,
      source: "demo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const profile: AppProfile = {
    id: "local-profile",
    role: "partner",
    name: "Демо",
    averageCycleLength: 28,
    averagePeriodLength: 5,
    theme: "system",
    onboardingCompleted: true,
    partnerSharing: defaultSharing,
    partnerInviteConfirmed: true,
    partnerInviteConfirmedAt: new Date().toISOString(),
    supportPreferences: {
      preferredSupport: ["Предложить спокойный вечер и практическую помощь"],
      avoidWhenPossible: "Не спрашивать слишком много раз подряд",
      reassuranceText: "Я рядом и уважаю твой темп.",
      updatedAt: new Date().toISOString()
    },
    hidePrivateMarkers: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return { profile, cycles, logs };
}
