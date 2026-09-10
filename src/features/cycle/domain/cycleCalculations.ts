import {
  differenceInCalendarDays,
  isAfter,
  parseISO
} from "date-fns";
import type { CycleEntry, CyclePhase, PredictionResult } from "../../../types";
import { calculateCyclePrediction } from "./cyclePredictionService";
import { differenceInCalendarDaysSafe, formatLocalDate } from "./dateUtils";

export function sortCycles(cycles: CycleEntry[]) {
  return [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function filterValidCycles(cycles: CycleEntry[]) {
  return sortCycles(cycles).filter((cycle) => {
    const start = parseISO(cycle.startDate);
    if (Number.isNaN(start.getTime())) return false;
    if (cycle.endDate && differenceInCalendarDays(parseISO(cycle.endDate), start) < 0) return false;
    if (cycle.cycleLength && (cycle.cycleLength < 15 || cycle.cycleLength > 60)) return false;
    if (cycle.periodLength && (cycle.periodLength < 1 || cycle.periodLength > 14)) return false;
    return true;
  });
}

export function average(values: number[], fallback: number) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (clean.length === 0) return fallback;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

export function averageCycleLength(cycles: CycleEntry[], fallback = 28) {
  const valid = filterValidCycles(cycles);
  const explicit = valid.flatMap((cycle) => (cycle.cycleLength ? [cycle.cycleLength] : []));
  const inferred = valid
    .slice(0, -1)
    .map((cycle, index) =>
      differenceInCalendarDays(parseISO(valid[index + 1].startDate), parseISO(cycle.startDate))
    )
    .filter((length) => length >= 15 && length <= 60);
  return average([...explicit, ...inferred].slice(-6), fallback);
}

export function averagePeriodLength(cycles: CycleEntry[], fallback = 5) {
  const lengths = filterValidCycles(cycles).flatMap((cycle) => {
    if (cycle.periodLength) return [cycle.periodLength];
    if (!cycle.endDate) return [];
    return [differenceInCalendarDays(parseISO(cycle.endDate), parseISO(cycle.startDate)) + 1];
  });
  return average(lengths.slice(-6), fallback);
}

export function getCycleDay(cycles: CycleEntry[], atDate = new Date()) {
  const valid = filterValidCycles(cycles).filter((cycle) => !isAfter(parseISO(cycle.startDate), atDate));
  const latest = valid.at(-1);
  if (!latest) return 1;
  return differenceInCalendarDays(atDate, parseISO(latest.startDate)) + 1;
}

export function getCurrentPhase(cycleDay: number, avgCycle: number, avgPeriod: number): CyclePhase {
  const ovulationDay = Math.max(10, avgCycle - 13);
  if (cycleDay <= avgPeriod) return "menstrual";
  if (cycleDay === ovulationDay) return "ovulation";
  if (cycleDay >= ovulationDay - 5 && cycleDay <= ovulationDay + 1) return "fertile";
  if (cycleDay < ovulationDay - 5) return "follicular";
  return "luteal";
}

export function detectIrregularity(cycles: CycleEntry[]) {
  const valid = filterValidCycles(cycles);
  const lengths = valid
    .slice(0, -1)
    .map((cycle, index) =>
      differenceInCalendarDays(parseISO(valid[index + 1].startDate), parseISO(cycle.startDate))
    )
    .filter((length) => length >= 15 && length <= 60)
    .slice(-6);
  if (lengths.length < 3) return false;
  return Math.max(...lengths) - Math.min(...lengths) > 7;
}

export function predictCycle(
  cycles: CycleEntry[],
  atDate = new Date(),
  fallbackCycleLength = 28,
  fallbackPeriodLength = 5
): PredictionResult {
  const valid = filterValidCycles(cycles);
  const prediction = calculateCyclePrediction({
    cycles: valid,
    fallbackCycleLength,
    fallbackPeriodLength,
    generatedAt: atDate
  });
  const todayStr = formatLocalDate(atDate);
  const candidateCycles = valid.length > 0 ? valid : sortCycles(cycles);
  const latest =
    candidateCycles.filter((cycle) => cycle.startDate <= todayStr).at(-1) ||
    candidateCycles.at(-1);
  const avgPeriod = averagePeriodLength(valid, fallbackPeriodLength);
  const currentDay = latest ? differenceInCalendarDaysSafe(todayStr, latest.startDate) + 1 : 1;
  const irregular = detectIrregularity(valid);

  const effectivePeriodLength =
    latest?.endDate && todayStr >= latest.startDate
      ? Math.max(1, differenceInCalendarDaysSafe(latest.endDate, latest.startDate) + 1)
      : avgPeriod;

  let currentPhase = getCurrentPhase(Math.max(1, currentDay), prediction.estimatedCycleLength, effectivePeriodLength);

  // If the period has explicitly ended and today is strictly past the end date, the phase cannot be menstrual
  if (latest?.endDate && todayStr > latest.endDate && currentPhase === "menstrual") {
    currentPhase = "follicular";
  }

  return {
    cycleDay: Math.max(1, currentDay),
    currentPhase,
    predictedNextPeriodStart: prediction.predictedNextPeriodStart,
    predictedPeriodEnd: prediction.predictedNextPeriodEnd,
    uncertaintyStart: prediction.uncertaintyStart,
    uncertaintyEnd: prediction.uncertaintyEnd,
    predictedOvulationDate: prediction.predictedOvulationDate ?? prediction.predictedNextPeriodStart,
    fertileWindowStart: prediction.fertileWindowStart ?? prediction.predictedNextPeriodStart,
    fertileWindowEnd: prediction.fertileWindowEnd ?? prediction.predictedNextPeriodStart,
    averageCycleLength: prediction.estimatedCycleLength,
    averagePeriodLength: effectivePeriodLength,
    irregularityDetected: irregular,
    dataConfidence: prediction.confidence,
    pendingExpectation: prediction.pendingExpectation,
    futureProjections: prediction.futureProjections
  };
}

export function isDateInRange(date: string, start?: string, end?: string) {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

export interface CalendarDayInfo {
  date: string;
  cycleDay: number;
  phase: CyclePhase;
  isActualPeriod: boolean;
  isPredictedPeriod: boolean;
  isOvulation: boolean;
  isFertile: boolean;
}

export function getCalendarDayInfo(
  date: string,
  cycles: CycleEntry[],
  fallbackCycleLength = 28,
  fallbackPeriodLength = 5,
  generatedAt = new Date()
): CalendarDayInfo {
  const prediction = calculateCyclePrediction({ cycles, fallbackCycleLength, fallbackPeriodLength, generatedAt });
  const projections = prediction.futureProjections;
  const valid = filterValidCycles(cycles);
  const candidateCycles = valid.length > 0 ? valid : sortCycles(cycles);
  const latest = candidateCycles
    .filter((cycle) => cycle.startDate <= date)
    .at(-1) || candidateCycles.at(-1);
  const cycleDay = latest ? differenceInCalendarDaysSafe(date, latest.startDate) + 1 : 1;
  const isActualPeriod = cycles.some((cycle) =>
    isDateInRange(date, cycle.startDate, cycle.endDate ?? cycle.startDate)
  );
  const isPredictedPeriod = projections.some((projection) =>
    isDateInRange(date, projection.predictedStartDate, projection.predictedEndDate)
  );
  const isOvulation = projections.some((projection) => date === projection.ovulationDate);
  const isFertile = projections.some((projection) =>
    isDateInRange(date, projection.fertileWindowStart, projection.fertileWindowEnd)
  );
  const effectivePeriodLength =
    latest?.endDate && date >= latest.startDate
      ? Math.max(1, differenceInCalendarDaysSafe(latest.endDate, latest.startDate) + 1)
      : fallbackPeriodLength;
  let phase = isOvulation
    ? "ovulation"
    : isFertile
      ? "fertile"
      : isActualPeriod
        ? "menstrual"
      : isPredictedPeriod
        ? "menstrual"
      : getCurrentPhase(Math.max(1, cycleDay), prediction.estimatedCycleLength, effectivePeriodLength);

  if (latest?.endDate && date > latest.endDate && phase === "menstrual" && !isActualPeriod && !isPredictedPeriod) {
    phase = "follicular";
  }

  return {
    date,
    cycleDay,
    phase,
    isActualPeriod,
    isPredictedPeriod,
    isOvulation,
    isFertile
  };
}

export function pluralDays(count: number) {
  const absolute = Math.abs(count);
  const last = absolute % 10;
  const lastTwo = absolute % 100;
  if (last === 1 && lastTwo !== 11) return `${count} день`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} дня`;
  return `${count} дней`;
}

export function daysUntil(date: string, from = new Date()) {
  return Math.max(0, differenceInCalendarDays(parseISO(date), from));
}

export function phaseHint(phase: CyclePhase) {
  const hints: Record<CyclePhase, string> = {
    menstrual: "В эти дни может хотеться больше тишины и отдыха. Наблюдай за собой без давления.",
    follicular: "Часто это удобный период для мягкого планирования, но ощущения всегда индивидуальны.",
    fertile: "Это только календарная подсказка о возможном фертильном окне, не медицинский прогноз.",
    ovulation: "Предполагаемый день овуляции рассчитан приблизительно по календарным данным.",
    luteal: "На этом этапе некоторым помогает спокойный режим сна и заранее запланированные паузы."
  };
  return hints[phase];
}

export function dailyAdvice(phase: CyclePhase) {
  const advice: Record<CyclePhase, string> = {
    menstrual: "Запиши боль и интенсивность выделений: это поможет заметить личные закономерности.",
    follicular: "Отметь энергию дня, даже если всё обычно. Такие записи полезны для сравнения.",
    fertile: "Не используй календарный прогноз как единственный способ контрацепции.",
    ovulation: "Если записываешь ощущения, формулируй их нейтрально: приложение не ставит диагнозы.",
    luteal: "Короткая заметка о сне и настроении поможет отчёту стать точнее."
  };
  return advice[phase];
}
