import type { PartnerAccessLevel, PartnerSharingPreferences } from "../../../types";

export type PartnerPermissionKey =
  | "shareCurrentCycleDay"
  | "shareCurrentPhase"
  | "sharePredictedPeriod"
  | "sharePredictionRange"
  | "shareCalendar"
  | "shareConfirmedPeriodDays"
  | "sharePredictedPeriodDays"
  | "shareFertileWindow"
  | "shareOvulationPrediction"
  | "shareDailyWellbeing"
  | "shareMood"
  | "shareEnergy"
  | "shareSleep"
  | "sharePainLevel"
  | "shareSymptoms"
  | "shareDischarge"
  | "shareDayNotes"
  | "sharePrivateMarkers"
  | "shareIntimacy"
  | "shareCycleHistory"
  | "shareStatistics"
  | "shareReports"
  | "shareSupportPreferences";

export const partnerPermissionKeys: PartnerPermissionKey[] = [
  "shareCurrentCycleDay",
  "shareCurrentPhase",
  "sharePredictedPeriod",
  "sharePredictionRange",
  "shareCalendar",
  "shareConfirmedPeriodDays",
  "sharePredictedPeriodDays",
  "shareFertileWindow",
  "shareOvulationPrediction",
  "shareDailyWellbeing",
  "shareMood",
  "shareEnergy",
  "shareSleep",
  "sharePainLevel",
  "shareSymptoms",
  "shareDischarge",
  "shareDayNotes",
  "sharePrivateMarkers",
  "shareIntimacy",
  "shareCycleHistory",
  "shareStatistics",
  "shareReports",
  "shareSupportPreferences"
];

export interface PermissionMeta {
  key: PartnerPermissionKey;
  section: "cycle" | "calendar" | "wellbeing" | "comments" | "statistics" | "private" | "support";
  title: string;
  description: string;
  sensitivity: "низкая" | "средняя" | "высокая";
  preview: string;
}

export const permissionMeta: PermissionMeta[] = [
  {
    key: "shareCurrentCycleDay",
    section: "cycle",
    title: "День цикла",
    description: "Партнёр увидит только номер текущего дня цикла.",
    sensitivity: "низкая",
    preview: "18-й день цикла"
  },
  {
    key: "shareCurrentPhase",
    section: "cycle",
    title: "Текущая фаза",
    description: "Показывает приблизительную фазу без медицинских выводов.",
    sensitivity: "низкая",
    preview: "Лютеиновая фаза"
  },
  {
    key: "sharePredictedPeriod",
    section: "cycle",
    title: "Прогноз месячных",
    description: "Показывает предполагаемую дату начала месячных.",
    sensitivity: "средняя",
    preview: "Около 10 дней до предполагаемых месячных"
  },
  {
    key: "sharePredictionRange",
    section: "cycle",
    title: "Диапазон прогноза",
    description: "Показывает диапазон неопределённости прогноза.",
    sensitivity: "средняя",
    preview: "Ожидаемый диапазон: 24-28 июля"
  },
  {
    key: "shareCalendar",
    section: "calendar",
    title: "Календарь фаз",
    description: "Открывает партнёрский календарь без возможности редактирования.",
    sensitivity: "средняя",
    preview: "Цветные дни фаз и прогнозов"
  },
  {
    key: "shareConfirmedPeriodDays",
    section: "calendar",
    title: "Подтверждённые дни месячных",
    description: "Показывает только отмеченные дни месячных.",
    sensitivity: "средняя",
    preview: "Фактические дни выделены отдельно"
  },
  {
    key: "sharePredictedPeriodDays",
    section: "calendar",
    title: "Прогнозные дни месячных",
    description: "Показывает предполагаемые дни будущих месячных.",
    sensitivity: "средняя",
    preview: "Прогноз отмечен пунктиром"
  },
  {
    key: "shareFertileWindow",
    section: "calendar",
    title: "Фертильное окно",
    description: "Показывает приблизительное календарное фертильное окно.",
    sensitivity: "высокая",
    preview: "Фертильное окно отмечено мягкой полосой"
  },
  {
    key: "shareOvulationPrediction",
    section: "calendar",
    title: "Предполагаемая овуляция",
    description: "Показывает приблизительную дату овуляции.",
    sensitivity: "высокая",
    preview: "День овуляции отмечен точкой"
  },
  {
    key: "shareDailyWellbeing",
    section: "wellbeing",
    title: "Общее самочувствие",
    description: "Показывает выбранный уровень самочувствия за день.",
    sensitivity: "средняя",
    preview: "Самочувствие: хорошо"
  },
  {
    key: "shareMood",
    section: "wellbeing",
    title: "Настроение",
    description: "Показывает только выбранное настроение, без выводов о причинах.",
    sensitivity: "средняя",
    preview: "Настроение: спокойное"
  },
  {
    key: "shareEnergy",
    section: "wellbeing",
    title: "Энергия",
    description: "Показывает уровень энергии, если он был записан.",
    sensitivity: "средняя",
    preview: "Энергия: низкая"
  },
  {
    key: "shareSleep",
    section: "wellbeing",
    title: "Сон",
    description: "Показывает качество и длительность сна.",
    sensitivity: "средняя",
    preview: "Сон: нормально, 7 часов"
  },
  {
    key: "sharePainLevel",
    section: "wellbeing",
    title: "Боль",
    description: "Показывает уровень боли без медицинских выводов.",
    sensitivity: "высокая",
    preview: "Боль: 4/10"
  },
  {
    key: "shareSymptoms",
    section: "wellbeing",
    title: "Симптомы",
    description: "Показывает выбранные симптомы за день.",
    sensitivity: "высокая",
    preview: "Симптомы: усталость"
  },
  {
    key: "shareDischarge",
    section: "wellbeing",
    title: "Выделения",
    description: "Показывает отмеченную интенсивность выделений.",
    sensitivity: "высокая",
    preview: "Выделения: лёгкие"
  },
  {
    key: "shareDayNotes",
    section: "comments",
    title: "Комментарии к дням",
    description: "Комментарии будут видны только если общий доступ включён и конкретная заметка открыта отдельно.",
    sensitivity: "высокая",
    preview: "Заметка показывается только после двойного разрешения"
  },
  {
    key: "shareCycleHistory",
    section: "statistics",
    title: "История циклов",
    description: "Показывает только сводку прошлых циклов.",
    sensitivity: "средняя",
    preview: "Цикл 28 дней, месячные 5 дней"
  },
  {
    key: "shareStatistics",
    section: "statistics",
    title: "Общая статистика",
    description: "Показывает агрегированные значения без исходных записей.",
    sensitivity: "средняя",
    preview: "Средняя боль, частые симптомы"
  },
  {
    key: "shareReports",
    section: "statistics",
    title: "Отчёты",
    description: "Показывает краткие отчёты по завершённым циклам.",
    sensitivity: "средняя",
    preview: "Сводка завершённого цикла"
  },
  {
    key: "sharePrivateMarkers",
    section: "private",
    title: "Приватные маркеры",
    description: "Показывает только факт приватной записи без подробностей.",
    sensitivity: "высокая",
    preview: "Есть приватная отметка"
  },
  {
    key: "shareIntimacy",
    section: "private",
    title: "Интимные данные",
    description: "Включается только в полном read-only доступе или отдельным явным разрешением.",
    sensitivity: "высокая",
    preview: "Интимная отметка и приватная заметка только для просмотра"
  },
  {
    key: "shareSupportPreferences",
    section: "support",
    title: "Предпочтения поддержки",
    description: "Помогает партнёру понять, какая помощь будет уместной.",
    sensitivity: "низкая",
    preview: "Лучше предложить чай и спокойный вечер"
  }
];

export function createDefaultSharing(now = new Date().toISOString()): PartnerSharingPreferences {
  return {
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
    shareMood: false,
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
    accessLevel: "basic",
    accessPaused: false,
    partnerDisconnected: false,
    updatedAt: now
  };
}

export function normalizePartnerSharing(
  value?: Partial<PartnerSharingPreferences> | Record<string, unknown>,
  now = new Date().toISOString()
): PartnerSharingPreferences {
  const defaults = createDefaultSharing(now);
  if (!value) return defaults;
  const source = value as Partial<PartnerSharingPreferences> & Record<string, unknown>;

  return {
    ...defaults,
    ...source,
    shareCurrentCycleDay: booleanFrom(source.shareCurrentCycleDay, source.cycleSummary, defaults.shareCurrentCycleDay),
    shareCurrentPhase: booleanFrom(source.shareCurrentPhase, source.cycleSummary, defaults.shareCurrentPhase),
    sharePredictedPeriod: booleanFrom(source.sharePredictedPeriod, source.nextPeriod, defaults.sharePredictedPeriod),
    sharePredictionRange: booleanFrom(source.sharePredictionRange, source.nextPeriod, defaults.sharePredictionRange),
    shareCalendar: booleanFrom(source.shareCalendar, source.cycleSummary, defaults.shareCalendar),
    shareConfirmedPeriodDays: booleanFrom(source.shareConfirmedPeriodDays, source.cycleSummary, defaults.shareConfirmedPeriodDays),
    sharePredictedPeriodDays: booleanFrom(source.sharePredictedPeriodDays, source.nextPeriod, defaults.sharePredictedPeriodDays),
    shareFertileWindow: booleanFrom(source.shareFertileWindow, source.fertileWindow, defaults.shareFertileWindow),
    shareOvulationPrediction: booleanFrom(source.shareOvulationPrediction, source.fertileWindow, defaults.shareOvulationPrediction),
    shareDailyWellbeing: booleanFrom(source.shareDailyWellbeing, source.wellbeing, defaults.shareDailyWellbeing),
    shareMood: booleanFrom(source.shareMood, source.mood, defaults.shareMood),
    shareEnergy: booleanFrom(source.shareEnergy, undefined, defaults.shareEnergy),
    shareSleep: booleanFrom(source.shareSleep, undefined, defaults.shareSleep),
    sharePainLevel: booleanFrom(source.sharePainLevel, source.pain, defaults.sharePainLevel),
    shareSymptoms: booleanFrom(source.shareSymptoms, source.symptoms, defaults.shareSymptoms),
    shareDischarge: booleanFrom(source.shareDischarge, source.flow, defaults.shareDischarge),
    shareDayNotes: booleanFrom(source.shareDayNotes, source.notes, defaults.shareDayNotes),
    sharePrivateMarkers: booleanFrom(source.sharePrivateMarkers, source.privateMarkers, defaults.sharePrivateMarkers),
    shareIntimacy: booleanFrom(source.shareIntimacy, source.intimacy, defaults.shareIntimacy),
    shareCycleHistory: booleanFrom(source.shareCycleHistory, undefined, defaults.shareCycleHistory),
    shareStatistics: booleanFrom(source.shareStatistics, undefined, defaults.shareStatistics),
    shareReports: booleanFrom(source.shareReports, undefined, defaults.shareReports),
    shareSupportPreferences: booleanFrom(source.shareSupportPreferences, undefined, defaults.shareSupportPreferences),
    accessLevel: isAccessLevel(source.accessLevel) ? source.accessLevel : defaults.accessLevel,
    accessPaused: booleanFrom(source.accessPaused, undefined, defaults.accessPaused),
    partnerDisconnected: booleanFrom(source.partnerDisconnected, undefined, defaults.partnerDisconnected),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now
  };
}

export function applyPartnerAccessLevel(
  level: PartnerAccessLevel,
  current: PartnerSharingPreferences,
  now = new Date().toISOString()
): PartnerSharingPreferences {
  if (level === "custom") return { ...current, accessLevel: "custom", updatedAt: now };

  const next = createDefaultSharing(now);
  next.accessLevel = level;
  next.accessPaused = current.accessPaused;
  next.partnerDisconnected = current.partnerDisconnected;
  next.sharePrivateMarkers = false;
  next.shareIntimacy = false;

  if (level === "full") {
    partnerPermissionKeys.forEach((key) => {
      next[key] = true;
    });
    return next;
  }

  if (level === "wellbeing" || level === "detailed") {
    next.shareDailyWellbeing = true;
    next.shareMood = true;
    next.shareEnergy = true;
    next.shareSleep = true;
    next.sharePainLevel = true;
    next.shareSymptoms = true;
    next.shareDischarge = true;
  }

  if (level === "detailed") {
    next.shareDayNotes = true;
    next.shareCycleHistory = true;
    next.shareStatistics = true;
    next.shareReports = true;
  }

  return next;
}

export function countEnabledPermissions(permissions: PartnerSharingPreferences) {
  return partnerPermissionKeys.filter((key) => permissions[key]).length;
}

function booleanFrom(value: unknown, legacy: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof legacy === "boolean") return legacy;
  return fallback;
}

function isAccessLevel(value: unknown): value is PartnerAccessLevel {
  return value === "basic" || value === "wellbeing" || value === "detailed" || value === "full" || value === "custom";
}
