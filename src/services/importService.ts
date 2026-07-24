import type { BackupPayload, CycleEntry, DailyLog, FlowLevel, Mood } from "../types";

const moods: Mood[] = [
  "good",
  "calm",
  "energetic",
  "sensitive",
  "changeable",
  "irritated",
  "anxious",
  "sad",
  "happy",
  "tired",
  "tense"
];
const flows: FlowLevel[] = ["none", "spotting", "light", "medium", "heavy"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCycle(value: unknown): value is CycleEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isIsoDate(value.startDate) &&
    (value.endDate === undefined || isIsoDate(value.endDate)) &&
    (value.periodLength === undefined ||
      (typeof value.periodLength === "number" && value.periodLength >= 1 && value.periodLength <= 14)) &&
    (value.cycleLength === undefined ||
      (typeof value.cycleLength === "number" && value.cycleLength >= 15 && value.cycleLength <= 60)) &&
    (value.source === "user" || value.source === "demo") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isLog(value: unknown): value is DailyLog {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isIsoDate(value.date) &&
    (value.mood === undefined || moods.includes(value.mood as Mood)) &&
    (value.moodChangedDuringDay === undefined || typeof value.moodChangedDuringDay === "boolean") &&
    (value.energy === undefined ||
      (typeof value.energy === "number" && value.energy >= 0 && value.energy <= 10)) &&
    (value.energyLevel === undefined || typeof value.energyLevel === "string") &&
    (value.wellbeing === undefined || typeof value.wellbeing === "string") &&
    (value.pain === undefined || (typeof value.pain === "number" && value.pain >= 0 && value.pain <= 10)) &&
    (value.painLevel === undefined ||
      (typeof value.painLevel === "number" && value.painLevel >= 0 && value.painLevel <= 10)) &&
    (value.flow === undefined || flows.includes(value.flow as FlowLevel)) &&
    Array.isArray(value.symptoms) &&
    value.symptoms.every((symptom) => typeof symptom === "string") &&
    (value.customSymptom === undefined ||
      (typeof value.customSymptom === "string" && value.customSymptom.length <= 100)) &&
    (value.sleepQuality === undefined || typeof value.sleepQuality === "string") &&
    (value.sleepHours === undefined ||
      (typeof value.sleepHours === "number" && value.sleepHours >= 0 && value.sleepHours <= 16)) &&
    (value.temperature === undefined ||
      (typeof value.temperature === "number" && value.temperature >= 34 && value.temperature <= 42)) &&
    (value.note === undefined || (typeof value.note === "string" && value.note.length <= 1000)) &&
    (value.intimacy === undefined || isRecord(value.intimacy)) &&
    (value.source === "user" || value.source === "demo") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function parseBackup(json: string): BackupPayload {
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed) || parsed.version !== 1) {
    throw new Error("Файл не похож на резервную копию LunaPair.");
  }
  if (!isRecord(parsed.profile) || !Array.isArray(parsed.cycles) || !Array.isArray(parsed.dailyLogs)) {
    throw new Error("В резервной копии не хватает обязательных данных.");
  }
  if (!parsed.cycles.every(isCycle) || !parsed.dailyLogs.every(isLog)) {
    throw new Error("Резервная копия содержит повреждённые записи.");
  }
  const profile = parsed.profile;
  if (
    profile.id !== "local-profile" ||
    (profile.role !== "tracker" && profile.role !== "partner") ||
    typeof profile.name !== "string"
  ) {
    throw new Error("Профиль в резервной копии повреждён.");
  }
  return parsed as unknown as BackupPayload;
}
