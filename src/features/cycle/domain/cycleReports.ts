import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CycleEntry, CycleReport, DailyLog, Mood } from "../../../types";
import { differenceInCalendarDaysSafe } from "./dateUtils";

function inCycle(log: DailyLog, cycle: CycleEntry, nextCycle?: CycleEntry) {
  const end = nextCycle ? nextCycle.startDate : cycle.endDate;
  if (!end) return log.date >= cycle.startDate;
  return nextCycle ? log.date >= cycle.startDate && log.date < end : log.date >= cycle.startDate && log.date <= end;
}

function mode<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function averagePain(logs: DailyLog[]) {
  const values = logs
    .map((log) => log.painLevel ?? log.pain)
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

export function frequentSymptoms(logs: DailyLog[]) {
  const symptoms = logs.flatMap((log) => log.symptoms ?? []);
  const counts = new Map<string, number>();
  symptoms.forEach((symptom) => counts.set(symptom, (counts.get(symptom) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([symptom]) => symptom);
}

export function frequentMood(logs: DailyLog[]) {
  return mode(logs.flatMap((log) => (log.mood ? [log.mood] : []))) as Mood | undefined;
}

export function completionRate(cycle: CycleEntry, logs: DailyLog[], nextCycle?: CycleEntry) {
  const start = parseISO(cycle.startDate);
  const end = parseISO(nextCycle?.startDate ?? cycle.endDate ?? cycle.startDate);
  const length = Math.max(1, differenceInCalendarDays(end, start) + 1);
  return Math.min(100, Math.round((logs.length / length) * 100));
}

export function buildCycleReport(cycle: CycleEntry, allLogs: DailyLog[], nextCycle?: CycleEntry): CycleReport {
  const logs = allLogs.filter((log) => inCycle(log, cycle, nextCycle));
  const actualLength = nextCycle
    ? differenceInCalendarDays(parseISO(nextCycle.startDate), parseISO(cycle.startDate))
    : cycle.cycleLength;
  const predictedDeviationDays =
    cycle.cycleLength && actualLength ? Math.round(actualLength - cycle.cycleLength) : undefined;

  return {
    cycleId: cycle.id,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    cycleLength: actualLength,
    periodLength: cycle.periodLength,
    logCount: logs.length,
    completionRate: completionRate(cycle, logs, nextCycle),
    averagePain: averagePain(logs),
    frequentMood: frequentMood(logs),
    frequentSymptoms: frequentSymptoms(logs),
    predictedDeviationDays,
    insufficientData: logs.length < 3
  };
}

export function buildReports(cycles: CycleEntry[], logs: DailyLog[]) {
  const sorted = [...cycles]
    .filter((cycle, index, source) => source.findIndex((item) => item.startDate === cycle.startDate) === index)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return sorted
    .filter((cycle, index) => {
      const next = sorted[index + 1];
      if (!next) return false;
      const length = differenceInCalendarDaysSafe(next.startDate, cycle.startDate);
      return length >= 15 && length <= 90;
    })
    .map((cycle, index) => buildCycleReport(cycle, logs, sorted[index + 1]))
    .reverse();
}

export function personalInsight(logs: DailyLog[], cycleDay: number) {
  const nearby = logs.filter((log) => {
    const storedDay = Number(log.date.slice(-2));
    return Math.abs(storedDay - cycleDay) <= 2;
  });
  if (nearby.length < 3) {
    return "Добавь записи нескольких циклов, чтобы увидеть личные закономерности. Сейчас подсказка остаётся общей.";
  }
  const symptom = frequentSymptoms(nearby)[0];
  const mood = frequentMood(nearby);
  if (symptom) return `В похожие дни ты часто отмечала: ${symptom}. Это наблюдение, не диагноз.`;
  if (mood) return `В похожие дни чаще встречалось настроение: ${mood}. Это не означает обязательную связь с циклом.`;
  return "В похожих днях пока нет устойчивой закономерности.";
}
