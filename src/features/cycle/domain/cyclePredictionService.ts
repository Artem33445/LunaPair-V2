import type {
  CycleEntry,
  DataConfidence,
  FutureCycleProjection,
  PendingPeriodExpectation
} from "../../../types";
import {
  addCalendarDays,
  differenceInCalendarDaysSafe,
  formatLocalDate
} from "./dateUtils";
import { buildFutureCycleProjections } from "./futureForecastService";
import { calculatePendingPeriodExpectation } from "./pendingPeriodExpectationService";

export interface CyclePrediction {
  generatedAt: string;
  basedOnLastConfirmedPeriodStart: string;
  estimatedCycleLength: number;
  predictedNextPeriodStart: string;
  predictedNextPeriodEnd: string;
  uncertaintyStart: string;
  uncertaintyEnd: string;
  predictedOvulationDate?: string;
  fertileWindowStart?: string;
  fertileWindowEnd?: string;
  confidence: DataConfidence;
  calculationMethod: string;
  validCompletedCyclesUsed: number;
  usedCycleLengths: number[];
  excludedSuspiciousStarts: string[];
  pendingExpectation: PendingPeriodExpectation;
  futureProjections: FutureCycleProjection[];
}

export interface CyclePredictionInput {
  cycles: CycleEntry[];
  fallbackCycleLength: number;
  fallbackPeriodLength: number;
  generatedAt?: Date;
}

function uniqueConfirmedStarts(cycles: CycleEntry[]) {
  return [...new Set(cycles.map((cycle) => cycle.startDate))]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function buildCycleIntervals(cycles: CycleEntry[]) {
  const starts = uniqueConfirmedStarts(cycles);
  return starts.slice(0, -1).map((start, index) => ({
    start,
    nextStart: starts[index + 1],
    length: differenceInCalendarDaysSafe(starts[index + 1], start)
  }));
}

export function calculateCyclePrediction(input: CyclePredictionInput): CyclePrediction {
  const starts = uniqueConfirmedStarts(input.cycles);
  const generatedAt = input.generatedAt ?? new Date();
  const fallbackCycle = Math.round(input.fallbackCycleLength || 28);
  const periodLength = Math.max(1, Math.round(input.fallbackPeriodLength || 5));
  const lastStart = starts.at(-1) ?? formatLocalDate(generatedAt);
  const intervals = buildCycleIntervals(input.cycles);
  const suspicious = intervals.filter((interval) => interval.length <= 14).map((interval) => interval.start);
  const usable = intervals
    .filter((interval) => interval.length >= 15 && interval.length <= 90)
    .slice(-6)
    .map((interval) => interval.length);

  let estimatedCycleLength = fallbackCycle;
  let confidence: DataConfidence = "low";
  let method = "Недостаточно завершённых циклов: используется средняя длина из профиля.";

  if (usable.length === 1) {
    estimatedCycleLength = Math.round((usable[0] + fallbackCycle) / 2);
    method = "Один завершённый цикл объединён с базовой длиной из профиля.";
  } else if (usable.length === 2) {
    estimatedCycleLength = Math.round((usable[0] + usable[1]) / 2);
    method = "Использовано среднее двух завершённых циклов, уверенность низкая.";
  } else if (usable.length >= 3) {
    estimatedCycleLength = median(usable);
    confidence = usable.length >= 4 && Math.max(...usable) - Math.min(...usable) <= 7 ? "high" : "medium";
    method = "Использована медиана последних пригодных завершённых циклов.";
  }

  if (usable.length === 1 || usable.length === 2) confidence = "low";
  if (intervals.some((interval) => interval.length > 90)) confidence = "low";

  const originalPredictedStart = addCalendarDays(lastStart, estimatedCycleLength);
  const pendingExpectation = calculatePendingPeriodExpectation(originalPredictedStart, generatedAt);
  const predictedStart = pendingExpectation.currentShiftedStart;
  const predictedEnd = addCalendarDays(predictedStart, periodLength - 1);
  const uncertainty = confidence === "high" ? 2 : confidence === "medium" ? 4 : 7;
  const ovulation = addCalendarDays(predictedStart, -14);
  const futureProjections = buildFutureCycleProjections({
    firstStartDate: predictedStart,
    periodLength,
    cycleLength: estimatedCycleLength,
    confidence,
    count: 6
  });

  return {
    generatedAt: generatedAt.toISOString(),
    basedOnLastConfirmedPeriodStart: lastStart,
    estimatedCycleLength,
    predictedNextPeriodStart: predictedStart,
    predictedNextPeriodEnd: predictedEnd,
    uncertaintyStart: addCalendarDays(predictedStart, -uncertainty),
    uncertaintyEnd: addCalendarDays(predictedStart, uncertainty),
    predictedOvulationDate: ovulation,
    fertileWindowStart: addCalendarDays(ovulation, -5),
    fertileWindowEnd: addCalendarDays(ovulation, 1),
    confidence,
    calculationMethod: method,
    validCompletedCyclesUsed: usable.length,
    usedCycleLengths: usable,
    excludedSuspiciousStarts: suspicious,
    pendingExpectation,
    futureProjections
  };
}

export function getCyclePredictionExplanation(prediction: CyclePrediction) {
  const lengths = prediction.usedCycleLengths.length
    ? prediction.usedCycleLengths.join(", ")
    : "завершённых циклов пока нет";
  return [
    `Последние подтверждённые месячные начались ${prediction.basedOnLastConfirmedPeriodStart}.`,
    `Использовано завершённых циклов: ${prediction.validCompletedCyclesUsed}; длины: ${lengths}.`,
    prediction.calculationMethod,
    `Оценочная длина цикла: ${prediction.estimatedCycleLength} дней.`,
    prediction.pendingExpectation.daysDelayed > 0
      ? `Первоначальный прогноз был ${prediction.pendingExpectation.originalPredictedStart}, сейчас ожидание сдвинуто на ${prediction.predictedNextPeriodStart}.`
      : `Следующая дата рассчитана как ${prediction.predictedNextPeriodStart}, диапазон: ${prediction.uncertaintyStart} — ${prediction.uncertaintyEnd}.`,
    `Уверенность прогноза: ${prediction.confidence}. Это справочный календарный расчёт, не медицинский прогноз.`
  ].join(" ");
}
