import { formatISO, subDays } from "date-fns";
import { getRepositories } from "../db/repositories";
import { id, todayIso } from "../lib/utils";
import type {
  AdviceTip,
  AdviceTipCategory,
  AppProfile,
  CycleEntry,
  DailyLog,
  PersonalAdvicePackage,
  PredictionResult
} from "../types";
import { generateStructuredAdvice, type AdviceGenerationContext, type GeneratedAdvicePayload } from "./aiService";

const adviceVersion = 1;
const adviceTtlMs = 24 * 60 * 60 * 1000;
const maxRecentLogs = 21;
const pendingAdviceRequests = new Map<string, Promise<PersonalAdviceResult>>();
const allowedCategories = new Set<AdviceTipCategory>([
  "wellbeing",
  "rest",
  "sleep",
  "hydration",
  "journal",
  "activity",
  "cycle",
  "medical-safety"
]);

export interface PersonalAdviceResult {
  advice: PersonalAdvicePackage;
  fromCache: boolean;
  stale: boolean;
  fallbackReason?: "missing-api-key" | "ai-unavailable" | "invalid-ai-output";
}

interface PersonalAdviceParams {
  profile: AppProfile;
  cycles: CycleEntry[];
  dailyLogs: DailyLog[];
  prediction: PredictionResult;
  uid?: string | null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function contextHash(context: AdviceGenerationContext) {
  return hashString(stableStringify(context));
}

function isFresh(advice: PersonalAdvicePackage | undefined, hash: string) {
  return Boolean(advice && advice.contextHash === hash && Date.parse(advice.expiresAt) > Date.now());
}

function sanitizeText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAdviceCategory(value: unknown): value is AdviceTipCategory {
  return typeof value === "string" && allowedCategories.has(value as AdviceTipCategory);
}

function validateGeneratedAdvice(payload: GeneratedAdvicePayload): Pick<PersonalAdvicePackage, "summary" | "tips"> {
  if (!isRecord(payload) || typeof payload.summary !== "string" || !Array.isArray(payload.tips)) {
    throw new Error("Invalid advice payload shape");
  }

  const tips = payload.tips.slice(0, 5).map((tip) => {
    if (!isRecord(tip) || typeof tip.title !== "string" || typeof tip.text !== "string" || !isAdviceCategory(tip.category)) {
      throw new Error("Invalid advice tip shape");
    }
    return {
      title: sanitizeText(tip.title, 64),
      text: sanitizeText(tip.text, 220),
      category: tip.category
    };
  });

  if (tips.length < 3) {
    throw new Error("AI returned too few advice tips");
  }

  return {
    summary: sanitizeText(payload.summary, 160),
    tips
  };
}

function buildAdvicePackage(
  hash: string,
  source: PersonalAdvicePackage["source"],
  content: Pick<PersonalAdvicePackage, "summary" | "tips">
): PersonalAdvicePackage {
  const generatedAt = new Date().toISOString();
  return {
    id: id("advice"),
    version: adviceVersion,
    generatedAt,
    expiresAt: new Date(Date.now() + adviceTtlMs).toISOString(),
    contextHash: hash,
    source,
    summary: content.summary,
    tips: content.tips
  };
}

function buildAdviceContext({
  profile,
  cycles,
  dailyLogs,
  prediction
}: Omit<PersonalAdviceParams, "uid">): AdviceGenerationContext {
  const cutoffDate = formatISO(subDays(new Date(), maxRecentLogs), { representation: "date" });
  const recentCycles = [...cycles]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(-6)
    .map((cycle) => ({
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      cycleLength: cycle.cycleLength,
      periodLength: cycle.periodLength
    }));
  const recentLogs = dailyLogs
    .filter((log) => log.date >= cutoffDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxRecentLogs)
    .map((log) => ({
      date: log.date,
      mood: log.mood,
      wellbeing: log.wellbeing,
      energyLevel: log.energyLevel,
      painLevel: log.painLevel ?? log.pain,
      flow: log.flow,
      symptoms: log.symptoms,
      sleepQuality: log.sleepQuality,
      sleepHours: log.sleepHours
    }));

  return {
    date: todayIso(),
    cycleDay: prediction.cycleDay,
    currentPhase: prediction.currentPhase,
    phaseIsEstimated: true,
    averageCycleLength: prediction.averageCycleLength || profile.averageCycleLength,
    averagePeriodLength: prediction.averagePeriodLength || profile.averagePeriodLength,
    dataConfidence: prediction.dataConfidence,
    irregularityDetected: prediction.irregularityDetected,
    predictedNextPeriodStart: prediction.predictedNextPeriodStart,
    predictedRange: {
      start: prediction.uncertaintyStart,
      end: prediction.uncertaintyEnd
    },
    recentCycles,
    recentLogs
  };
}

function phaseFallbackTip(phase: string): AdviceTip {
  const tips: Record<string, AdviceTip> = {
    menstrual: {
      title: "Бережный режим",
      text: "По расчетам приложения сейчас могут быть дни, когда телу комфортнее больше отдыха. Запиши боль и выделения, если они есть.",
      category: "rest"
    },
    follicular: {
      title: "Отметь энергию",
      text: "Если самочувствие ровное, все равно стоит отметить энергию дня. Такие спокойные записи хорошо помогают видеть личный ритм.",
      category: "journal"
    },
    fertile: {
      title: "Только календарная подсказка",
      text: "Предполагаемое фертильное окно рассчитано по календарным данным. Не используй его как единственный способ контрацепции.",
      category: "cycle"
    },
    ovulation: {
      title: "Наблюдай без выводов",
      text: "Предполагаемая овуляция не является подтвержденным фактом. Если есть ощущения, запиши их нейтрально и без самодиагностики.",
      category: "cycle"
    },
    luteal: {
      title: "Планируй паузы",
      text: "Если цикл идет примерно по ожидаемому графику, сейчас могут быть полезны короткие паузы, сон по расписанию и мягкий темп.",
      category: "wellbeing"
    }
  };
  return tips[phase] ?? tips.luteal;
}

function fallbackAdvice(context: AdviceGenerationContext): Pick<PersonalAdvicePackage, "summary" | "tips"> {
  const todayLog = context.recentLogs.find((log) => log.date === context.date);
  const tips: AdviceTip[] = [
    phaseFallbackTip(context.currentPhase),
    {
      title: "Короткая запись",
      text: "Добавь одну заметку о самочувствии, даже если день обычный. Чем регулярнее записи, тем точнее будут подсказки приложения.",
      category: "journal"
    },
    {
      title: "Вода и спокойный темп",
      text: "Поставь рядом воду и выбери нагрузку по ощущениям. Совет общий и не заменяет медицинские рекомендации.",
      category: "hydration"
    }
  ];

  if (todayLog?.sleepQuality === "bad" || todayLog?.energyLevel === "low" || todayLog?.energyLevel === "very-low") {
    tips.splice(1, 0, {
      title: "Сон важнее рывка",
      text: "Сегодня в записях заметны сон или энергия ниже обычного. Попробуй запланировать короткую паузу вместо дополнительной нагрузки.",
      category: "sleep"
    });
  }

  if ((todayLog?.painLevel ?? 0) >= 7) {
    tips.push({
      title: "Не терпеть сильную боль",
      text: "Если боль сильная, необычная или мешает обычным делам, лучше обратиться за квалифицированной медицинской помощью.",
      category: "medical-safety"
    });
  }

  return {
    summary: "Персональные советы готовы по текущим записям и расчетам приложения.",
    tips: tips.slice(0, 5)
  };
}

async function generateAndSaveAdvice(
  params: PersonalAdviceParams,
  context: AdviceGenerationContext,
  hash: string,
  cached: PersonalAdvicePackage | undefined
): Promise<PersonalAdviceResult> {
  const adviceRepository = getRepositories(params.uid).advice;

  if (!params.profile.geminiApiKey) {
    const advice = buildAdvicePackage(hash, "fallback", fallbackAdvice(context));
    await adviceRepository.save(advice);
    return { advice, fromCache: false, stale: false, fallbackReason: "missing-api-key" };
  }

  try {
    const generated = await generateStructuredAdvice(params.profile.geminiApiKey, context);
    const advice = buildAdvicePackage(hash, "ai", validateGeneratedAdvice(generated));
    await adviceRepository.save(advice);
    return { advice, fromCache: false, stale: false };
  } catch (error) {
    console.error("Personal advice generation failed:", error);
    if (cached) {
      return {
        advice: cached,
        fromCache: true,
        stale: true,
        fallbackReason: "ai-unavailable"
      };
    }

    const advice = buildAdvicePackage(hash, "fallback", fallbackAdvice(context));
    await adviceRepository.save(advice);
    return { advice, fromCache: false, stale: false, fallbackReason: "invalid-ai-output" };
  }
}

export async function getPersonalAdvice(params: PersonalAdviceParams): Promise<PersonalAdviceResult> {
  const adviceRepository = getRepositories(params.uid).advice;
  const context = buildAdviceContext(params);
  const hash = contextHash(context);
  const cached = await adviceRepository.getLatest();

  if (isFresh(cached, hash) && (cached?.source === "ai" || !params.profile.geminiApiKey)) {
    return { advice: cached!, fromCache: true, stale: false };
  }

  const pendingKey = `${params.uid ?? "local"}:${hash}:${Boolean(params.profile.geminiApiKey)}`;
  const pending = pendingAdviceRequests.get(pendingKey);
  if (pending) return pending;

  const request = generateAndSaveAdvice(params, context, hash, cached).finally(() => {
    pendingAdviceRequests.delete(pendingKey);
  });
  pendingAdviceRequests.set(pendingKey, request);
  return request;
}
