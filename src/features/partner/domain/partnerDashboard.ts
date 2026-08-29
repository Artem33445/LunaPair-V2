import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import type {
  AppProfile,
  CycleEntry,
  DailyLog,
  PartnerDashboardData,
  PartnerPermissionsSummary,
  PartnerSharingPreferences,
  PartnerStatisticsSummary,
  PartnerVisibleDay
} from "../../../types";
import { getCalendarDayInfo, predictCycle } from "../../cycle/domain/cycleCalculations";
import { averagePain, frequentMood, frequentSymptoms } from "../../cycle/domain/cycleReports";
import { buildPartnerSupportCard } from "./partnerSupport";
import { countEnabledPermissions, normalizePartnerSharing, partnerPermissionKeys } from "./partnerPermissions";

export interface PartnerDashboardInput {
  profile?: AppProfile;
  cycles: CycleEntry[];
  dailyLogs: DailyLog[];
  startDate: string;
  endDate: string;
  atDate?: Date;
}

export function buildPartnerDashboardData({
  profile,
  cycles,
  dailyLogs,
  startDate,
  endDate,
  atDate = new Date()
}: PartnerDashboardInput): PartnerDashboardData {
  const permissions = normalizePartnerSharing(profile?.partnerSharing);
  const status = permissions.partnerDisconnected
    ? "disconnected"
    : permissions.accessPaused
      ? "paused"
      : profile?.partnerInviteConfirmed 
        ? "active" 
        : "local-preview";
  const prediction = predictCycle(cycles, atDate, profile?.averageCycleLength, profile?.averagePeriodLength);
  const blocked = status !== "local-preview" && status !== "active";
  const fullAccess = permissions.accessLevel === "full";
  const todayDate = formatDate(atDate);
  const calendarDays = blocked || !permissions.shareCalendar
    ? []
    : datesBetween(startDate, endDate).map((date) =>
        buildPartnerVisibleDay({
          date,
          permissions,
          cycles,
          dailyLogs,
          fallbackCycleLength: profile?.averageCycleLength,
          fallbackPeriodLength: profile?.averagePeriodLength,
          generatedAt: atDate
        })
      );
  const today = blocked
    ? undefined
    : buildPartnerVisibleDay({
        date: todayDate,
        permissions,
        cycles,
        dailyLogs,
        fallbackCycleLength: profile?.averageCycleLength,
        fallbackPeriodLength: profile?.averagePeriodLength,
        generatedAt: atDate
      });
  const allowedLogs = fullAccess ? dailyLogs : dailyLogs.filter((log) => !log.hiddenFromPartner);
  const supportCard = blocked
    ? undefined
    : buildPartnerSupportCard({
        today,
        phase: fullAccess || permissions.shareCurrentPhase ? prediction.currentPhase : undefined,
        logs: permissions.shareStatistics ? allowedLogs : [],
        preferences: permissions.shareSupportPreferences ? profile?.supportPreferences : undefined
      });

  return {
    connectionStatus: status,
    partnerDisplayName: "Партнёрша",
    currentCycleDay: !blocked && (fullAccess || permissions.shareCurrentCycleDay) ? prediction.cycleDay : undefined,
    currentPhase: !blocked && (fullAccess || permissions.shareCurrentPhase) ? prediction.currentPhase : undefined,
    daysUntilPredictedPeriod: !blocked && (fullAccess || permissions.sharePredictedPeriod)
      ? Math.max(0, differenceInCalendarDays(parseISO(prediction.predictedNextPeriodStart), atDate))
      : undefined,
    predictedPeriodStart: !blocked && (fullAccess || permissions.sharePredictedPeriod) ? prediction.predictedNextPeriodStart : undefined,
    predictedRange: !blocked && (fullAccess || permissions.sharePredictionRange)
      ? { start: prediction.uncertaintyStart, end: prediction.uncertaintyEnd }
      : undefined,
    confidence: !blocked && (fullAccess || permissions.sharePredictedPeriod || permissions.sharePredictionRange) ? prediction.dataConfidence : undefined,
    today,
    calendarDays,
    cycleHistory: !blocked && (fullAccess || permissions.shareCycleHistory)
      ? cycles.map((cycle) => ({
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          cycleLength: cycle.cycleLength,
          periodLength: cycle.periodLength
        }))
      : undefined,
    statistics: !blocked && (fullAccess || permissions.shareStatistics)
      ? buildPartnerStatistics(allowedLogs, permissions)
      : undefined,
    supportCard,
    permissionsSummary: buildPermissionsSummary(permissions),
    prediction: !blocked ? prediction : undefined
  };
}

export function buildPartnerVisibleDay({
  date,
  permissions,
  cycles,
  dailyLogs,
  fallbackCycleLength = 28,
  fallbackPeriodLength = 5,
  generatedAt = new Date()
}: {
  date: string;
  permissions: PartnerSharingPreferences;
  cycles: CycleEntry[];
  dailyLogs: DailyLog[];
  fallbackCycleLength?: number;
  fallbackPeriodLength?: number;
  generatedAt?: Date;
}): PartnerVisibleDay {
  const log = dailyLogs.find((item) => item.date === date);
  const fullAccess = permissions.accessLevel === "full";
  const hidden = Boolean(log?.hiddenFromPartner) && !fullAccess;
  const info = getCalendarDayInfo(date, cycles, fallbackCycleLength, fallbackPeriodLength, generatedAt);
  const noteAllowed = Boolean((fullAccess || (permissions.shareDayNotes && log?.noteVisibleToPartner)) && log?.note && !hidden);
  const visibleCycle = !hidden && (fullAccess || permissions.shareCalendar);

  return {
    date,
    cycleDay: visibleCycle && (fullAccess || permissions.shareCurrentCycleDay) ? info.cycleDay : undefined,
    phase: visibleCycle && (fullAccess || permissions.shareCurrentPhase) ? info.phase : undefined,
    isConfirmedPeriodDay: visibleCycle && (fullAccess || permissions.shareConfirmedPeriodDays) ? info.isActualPeriod : undefined,
    isPredictedPeriodDay: visibleCycle && (fullAccess || permissions.sharePredictedPeriodDays) ? info.isPredictedPeriod : undefined,
    isFertileWindow: visibleCycle && (fullAccess || permissions.shareFertileWindow) ? info.isFertile : undefined,
    isPredictedOvulation: visibleCycle && (fullAccess || permissions.shareOvulationPrediction) ? info.isOvulation : undefined,
    wellbeing: !hidden && (fullAccess || permissions.shareDailyWellbeing) ? log?.wellbeing : undefined,
    mood: !hidden && (fullAccess || permissions.shareMood) ? log?.mood : undefined,
    energy: !hidden && (fullAccess || permissions.shareEnergy) ? log?.energyLevel : undefined,
    sleepQuality: !hidden && (fullAccess || permissions.shareSleep) ? log?.sleepQuality : undefined,
    sleepHours: !hidden && (fullAccess || permissions.shareSleep) ? log?.sleepHours : undefined,
    painLevel: !hidden && (fullAccess || permissions.sharePainLevel) ? log?.painLevel ?? log?.pain : undefined,
    symptoms: !hidden && (fullAccess || permissions.shareSymptoms) ? log?.symptoms ?? [] : undefined,
    discharge: !hidden && (fullAccess || permissions.shareDischarge) ? log?.flow : undefined,
    notePreview: noteAllowed ? log?.note : undefined,
    hasPrivateMarker: !hidden && (fullAccess || permissions.sharePrivateMarkers) ? Boolean(log?.intimacy?.occurred) : undefined,
    intimacy: !hidden && (fullAccess || permissions.shareIntimacy) ? log?.intimacy : undefined,
    visibility: {
      cycle: visibleCycle,
      wellbeing: !hidden && (fullAccess || permissions.shareDailyWellbeing),
      mood: !hidden && (fullAccess || permissions.shareMood),
      energy: !hidden && (fullAccess || permissions.shareEnergy),
      sleep: !hidden && (fullAccess || permissions.shareSleep),
      pain: !hidden && (fullAccess || permissions.sharePainLevel),
      symptoms: !hidden && (fullAccess || permissions.shareSymptoms),
      discharge: !hidden && (fullAccess || permissions.shareDischarge),
      note: noteAllowed,
      privateMarker: !hidden && (fullAccess || permissions.sharePrivateMarkers),
      intimacy: !hidden && (fullAccess || permissions.shareIntimacy)
    }
  };
}

export function buildPermissionsSummary(permissions: PartnerSharingPreferences): PartnerPermissionsSummary {
  return {
    accessLevel: permissions.accessLevel,
    accessPaused: permissions.accessPaused,
    partnerDisconnected: permissions.partnerDisconnected,
    enabledCount: countEnabledPermissions(permissions),
    sensitiveEnabledCount: [
      permissions.sharePainLevel,
      permissions.shareSymptoms,
      permissions.shareDischarge,
      permissions.shareDayNotes,
      permissions.sharePrivateMarkers,
      permissions.shareIntimacy
    ].filter(Boolean).length,
    hiddenByDefault: partnerPermissionKeys.filter((key) => !permissions[key])
  };
}

function buildPartnerStatistics(logs: DailyLog[], permissions: PartnerSharingPreferences): PartnerStatisticsSummary {
  const fullAccess = permissions.accessLevel === "full";
  return {
    averagePain: fullAccess || permissions.sharePainLevel ? averagePain(logs) ?? undefined : undefined,
    frequentMood: fullAccess || permissions.shareMood ? frequentMood(logs) : undefined,
    frequentSymptoms: fullAccess || permissions.shareSymptoms ? frequentSymptoms(logs) : [],
    logCount: logs.length
  };
}

function datesBetween(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);
  while (current <= end) {
    dates.push(formatDate(current));
    current = addDays(current, 1);
  }
  return dates;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
