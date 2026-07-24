import type { CycleEntry, CyclePhase, DailyLog } from "../../../types";
import { calculateCyclePrediction, getCyclePredictionExplanation } from "../../cycle/domain/cyclePredictionService";
import { daysUntil, phaseHint, predictCycle, pluralDays } from "../../cycle/domain/cycleCalculations";

export type AssistantUrgency = "normal" | "caution" | "urgent";

export interface AssistantResponse {
  answer: string;
  sources: string[];
  urgency: AssistantUrgency;
  usedPersonalContext: boolean;
}

export interface AssistantContext {
  cycles: CycleEntry[];
  logs: Array<Partial<DailyLog>>;
  averageCycleLength: number;
  averagePeriodLength: number;
  usePersonalContext: boolean;
  recentMessages: string[];
}

interface KnowledgeTopic {
  title: string;
  aliases: string[];
  keywords: string[];
  shortAnswer: string;
  fullAnswer: string;
  relatedTopics: string[];
  sourceNames: string[];
  reviewedAt: string;
  warningType: AssistantUrgency;
}

const phaseNames: Record<CyclePhase, string> = {
  menstrual: "менструальная фаза",
  follicular: "фолликулярная фаза",
  fertile: "предполагаемое фертильное окно",
  ovulation: "предполагаемая овуляция",
  luteal: "лютеиновая фаза"
};

const moodNames: Record<string, string> = {
  good: "хорошее",
  calm: "спокойное",
  energetic: "энергичное",
  sensitive: "чувствительное",
  changeable: "переменчивое",
  irritated: "раздражённое",
  anxious: "тревожное",
  sad: "грустное",
  happy: "радостное",
  tired: "усталость",
  tense: "напряжение"
};

const topics: KnowledgeTopic[] = [
  {
    title: "Расчёт следующей даты",
    aliases: ["следующая дата", "прогноз", "месячные", "20 августа", "11 августа", "когда начнутся"],
    keywords: ["след", "прогноз", "дата", "месяч", "почему", "рассчит", "когда", "начнут"],
    shortAnswer: "Прогноз строится от последнего подтверждённого начала месячных.",
    fullAnswer:
      "LunaPair берёт только подтверждённые начала месячных, считает пригодные интервалы между ними и не включает прогнозируемые дни в историю. Если завершённых циклов мало или интервалы нестабильные, используется средняя длина из профиля и показывается более широкий диапазон.",
    relatedTopics: ["Фазы цикла", "Точность прогноза"],
    sourceNames: ["Локальная база знаний LunaPair", "NHS", "Mayo Clinic"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  },
  {
    title: "Фертильное окно",
    aliases: ["фертильность", "овуляция", "беременность", "контрацепция"],
    keywords: ["ферт", "овуляц", "беремен", "контрацеп", "зачат", "плодн"],
    shortAnswer: "Фертильное окно — приблизительная календарная оценка.",
    fullAnswer:
      "Оно зависит от стабильности цикла и не может считаться точным. Его нельзя использовать как единственный способ контрацепции, а любые важные решения лучше обсуждать со специалистом.",
    relatedTopics: ["Овуляция", "Точность прогноза"],
    sourceNames: ["Локальная база знаний LunaPair", "NHS", "CDC"],
    reviewedAt: "2026-07-18",
    warningType: "caution"
  },
  {
    title: "Текущая фаза",
    aliases: ["фаза", "лютеиновая", "фолликулярная", "менструальная", "сегодня"],
    keywords: ["фаза", "этап", "лютеин", "фолликул", "самочувств", "сегодня", "день"],
    shortAnswer: "Фаза определяется по дню цикла и прогнозу следующей даты.",
    fullAnswer:
      "Фазы в LunaPair являются справочной разметкой календаря. Они помогают ориентироваться в записях, но не объясняют автоматически настроение, боль или симптомы.",
    relatedTopics: ["Симптомы", "Статистика"],
    sourceNames: ["Локальная база знаний LunaPair", "NHS"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  },
  {
    title: "Симптомы и дневник",
    aliases: ["симптомы", "что записывать", "дневник", "описание дня", "самочувствие"],
    keywords: ["симптом", "запис", "дневник", "самочув", "описан", "выделен", "боль", "энерг", "сон"],
    shortAnswer: "Лучше записывать то, что реально помогает увидеть повторяющиеся закономерности.",
    fullAnswer:
      "Полезны дата, интенсивность выделений, боль, настроение, энергия, сон, симптомы и короткий комментарий. Заметки не обязаны быть длинными: достаточно одной спокойной фразы о самочувствии или контексте дня.",
    relatedTopics: ["Статистика", "Приватность"],
    sourceNames: ["Локальная база знаний LunaPair"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  },
  {
    title: "Боль и тревожные сигналы",
    aliases: ["сильная боль", "обильные месячные", "кровотечение", "обморок"],
    keywords: ["боль", "сильн", "обильн", "кров", "обморок", "температур", "резко"],
    shortAnswer: "LunaPair не ставит диагнозы и не назначает лечение.",
    fullAnswer:
      "Если боль внезапная, необычно сильная, есть обморок, резкое ухудшение, температура или очень обильное кровотечение, лучше не ждать и обратиться за медицинской помощью. В обычных случаях приложение помогает только записать наблюдение.",
    relatedTopics: ["Медицинская безопасность"],
    sourceNames: ["Локальная база знаний LunaPair", "NHS"],
    reviewedAt: "2026-07-18",
    warningType: "caution"
  },
  {
    title: "Настроение, ПМС и эмоции",
    aliases: ["пмс", "настроение", "раздражение", "тревога", "эмоции"],
    keywords: ["пмс", "настро", "раздраж", "тревог", "эмоц", "плакс", "груст"],
    shortAnswer: "Настроение можно записывать, но нельзя автоматически объяснять его циклом.",
    fullAnswer:
      "Цикл может совпадать с изменениями самочувствия, но LunaPair не делает вывод, что настроение вызвано именно фазой. Лучше смотреть на повторяемость по нескольким циклам и учитывать сон, стресс, нагрузку и контекст дня.",
    relatedTopics: ["Статистика", "Поддержка партнёра"],
    sourceNames: ["Локальная база знаний LunaPair"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  },
  {
    title: "Задержка и нерегулярный цикл",
    aliases: ["задержка", "нерегулярный", "цикл сбился", "поздно начались"],
    keywords: ["задерж", "нерегуляр", "сбил", "позд", "длин", "короч", "стресс"],
    shortAnswer: "Одна задержка не даёт приложению права делать медицинский вывод.",
    fullAnswer:
      "LunaPair может показать, что ожидаемая дата сдвинулась, но не объясняет причину. На цикл могут влиять стресс, болезнь, сон, нагрузки и другие факторы. Если задержка необычная для тебя, есть беременность в вопросе или состояние тревожит, лучше обратиться к специалисту.",
    relatedTopics: ["Точность прогноза"],
    sourceNames: ["Локальная база знаний LunaPair", "NHS"],
    reviewedAt: "2026-07-18",
    warningType: "caution"
  },
  {
    title: "Статистика и отчёты",
    aliases: ["статистика", "график", "отчёт", "средняя боль", "закономерность"],
    keywords: ["статист", "граф", "отч", "средн", "закономер", "часто", "данн"],
    shortAnswer: "Статистика полезна после нескольких циклов и достаточного количества записей.",
    fullAnswer:
      "Графики показывают агрегированные наблюдения: боль, энергию, симптомы и заполненность. Они помогают заметить повторяемость, но не доказывают причину и не заменяют медицинскую оценку.",
    relatedTopics: ["Симптомы", "Точность данных"],
    sourceNames: ["Локальная база знаний LunaPair"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  },
  {
    title: "Поддержка партнёра",
    aliases: ["партнёр", "парень", "поддержка", "что сказать", "как помочь"],
    keywords: ["партн", "поддерж", "парень", "помочь", "сказать", "забот", "границ"],
    shortAnswer: "Хорошая поддержка начинается с вопроса и уважения границ.",
    fullAnswer:
      "Партнёрский режим показывает только разрешённые категории. Рекомендации должны звучать как предложение помощи, а не контроль: спросить, нужна ли вода, еда, тишина, помощь с делами или личное пространство.",
    relatedTopics: ["Приватность"],
    sourceNames: ["Локальные правила LunaPair"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  },
  {
    title: "Приватность и локальные данные",
    aliases: ["приватность", "кто видит", "данные", "интимные", "заметки", "локально"],
    keywords: ["приват", "видит", "данн", "интим", "замет", "локаль", "экспорт", "удал"],
    shortAnswer: "Данные LunaPair хранятся локально на устройстве.",
    fullAnswer:
      "Заметки и интимные данные не передаются ассистенту. В партнёрском режиме действует принцип: скрыто по умолчанию. Комментарий виден партнёру только если включён общий доступ к комментариям и конкретная заметка открыта отдельно.",
    relatedTopics: ["Партнёрский режим"],
    sourceNames: ["Локальные правила LunaPair"],
    reviewedAt: "2026-07-18",
    warningType: "normal"
  }
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/месеч/g, "месяч")
    .replace(/овуляцыя/g, "овуляция")
    .replace(/августа/g, "август")
    .replace(/\s+/g, " ")
    .trim();
}

function score(topic: KnowledgeTopic, query: string) {
  const haystack = [...topic.aliases, ...topic.keywords, topic.title].join(" ").toLowerCase();
  return query.split(" ").reduce((sum, word) => {
    if (word.length < 3) return sum;
    return sum + (haystack.includes(word) ? 1 : 0);
  }, 0);
}

function detectUrgency(query: string): AssistantUrgency {
  const urgent = [
    "обморок",
    "внезап",
    "очень силь",
    "необычно силь",
    "льёт",
    "льет",
    "резко хуже",
    "не могу встать",
    "сильное кровотечение"
  ];
  return urgent.some((word) => query.includes(word)) ? "urgent" : "normal";
}

export function buildAssistantResponse(question: string, context: AssistantContext): AssistantResponse {
  const query = normalize(question);
  const urgency = detectUrgency(query);
  if (urgency === "urgent") {
    return {
      answer:
        "По описанию есть повод не откладывать профессиональную медицинскую оценку. Я не ставлю диагнозы, но при внезапной сильной боли, обмороке, необычно сильном кровотечении или резком ухудшении состояния лучше обратиться к медицинскому специалисту.",
      sources: ["Локальная база знаний LunaPair", "NHS"],
      urgency: "urgent",
      usedPersonalContext: false
    };
  }

  const prediction = calculateCyclePrediction({
    cycles: context.cycles,
    fallbackCycleLength: context.averageCycleLength,
    fallbackPeriodLength: context.averagePeriodLength
  });
  const personalPrediction = predictCycle(
    context.cycles,
    new Date(),
    context.averageCycleLength,
    context.averagePeriodLength
  );
  const ranked = topics
    .map((topic) => ({ topic, score: score(topic, query) }))
    .sort((a, b) => b.score - a.score);
  const match = ranked[0]?.score ? ranked[0].topic : undefined;

  if (query.includes("как") && (query.includes("дат") || query.includes("прогноз") || query.includes("август") || query.includes("когда"))) {
    return {
      answer: `${getCyclePredictionExplanation(prediction)} ${buildPersonalForecastLine(context, personalPrediction)}`,
      sources: ["Локальная база знаний LunaPair", "NHS", "Mayo Clinic"],
      urgency: "normal",
      usedPersonalContext: true
    };
  }

  if (query.includes("фаза") || query.includes("сегодня") || query.includes("день цикла")) {
    return {
      answer:
        `${buildPersonalPhaseLine(context, personalPrediction)} ${phaseHint(personalPrediction.currentPhase)} Фазы являются приблизительной календарной подсказкой и не объясняют самочувствие автоматически.`,
      sources: ["Локальная база знаний LunaPair"],
      urgency: "normal",
      usedPersonalContext: context.usePersonalContext
    };
  }

  if (query.includes("покажи") && (query.includes("интим") || query.includes("замет"))) {
    return {
      answer:
        "Я не показываю приватные заметки и интимные данные. Эти поля исключены из контекста ассистента, а в партнёрском режиме скрыты по умолчанию.",
      sources: ["Локальные правила приватности LunaPair"],
      urgency: "normal",
      usedPersonalContext: false
    };
  }

  if (!match) {
    return buildFallbackAnswer(query, context, personalPrediction);
  }

  return {
    answer: `${match.shortAnswer} ${match.fullAnswer} ${buildOptionalContextLine(match.title, context, personalPrediction)}`,
    sources: match.sourceNames,
    urgency: match.warningType,
    usedPersonalContext: shouldUseContext(match.title, query) && context.usePersonalContext
  };
}

function buildFallbackAnswer(query: string, context: AssistantContext, prediction: ReturnType<typeof predictCycle>): AssistantResponse {
  const contextLine = context.usePersonalContext ? buildPersonalForecastLine(context, prediction) : "";
  const questionHint = query ? `Если я правильно понял вопрос, он про цикл, самочувствие или поддержку.` : "Можешь спросить про цикл, прогноз, симптомы, партнёрский режим или приватность.";
  return {
    answer:
      `${questionHint} Короткий безопасный ориентир такой: записывай факты, не делай выводы по одному дню и используй прогноз как приблизительную подсказку. ${contextLine} Я могу помочь сформулировать вопрос партнёру, объяснить дату прогноза, разобрать фазу, подсказать что записать в дневник или где включить доступ.`,
    sources: ["Локальная база знаний LunaPair"],
    urgency: "normal",
    usedPersonalContext: context.usePersonalContext
  };
}

function buildPersonalForecastLine(context: AssistantContext, prediction: ReturnType<typeof predictCycle>) {
  if (!context.usePersonalContext) return "";
  return `По текущим локальным данным сейчас примерно ${prediction.cycleDay}-й день цикла, фаза: ${phaseNames[prediction.currentPhase]}, до предполагаемых месячных ${pluralDays(daysUntil(prediction.predictedNextPeriodStart))}.`;
}

function buildPersonalPhaseLine(context: AssistantContext, prediction: ReturnType<typeof predictCycle>) {
  if (!context.usePersonalContext) return "Без личного контекста могу объяснить только общую логику фаз.";
  return `По локальным данным сейчас примерно ${prediction.cycleDay}-й день цикла: ${phaseNames[prediction.currentPhase]}.`;
}

function buildOptionalContextLine(title: string, context: AssistantContext, prediction: ReturnType<typeof predictCycle>) {
  if (!context.usePersonalContext) return "";
  if (title === "Симптомы и дневник") {
    const latest = [...context.logs].filter((log) => log.date).sort((a, b) => String(a.date).localeCompare(String(b.date))).at(-1);
    if (!latest) return "Личных записей пока мало, поэтому лучше начать с коротких ежедневных отметок.";
    const mood = latest.mood ? `настроение: ${moodNames[String(latest.mood)] ?? latest.mood}` : "настроение не отмечено";
    const symptoms = latest.symptoms?.length ? `симптомы: ${latest.symptoms.join(", ")}` : "симптомы не отмечены";
    return `Последняя безопасная запись: ${mood}, ${symptoms}.`;
  }
  if (title === "Текущая фаза" || title === "Расчёт следующей даты" || title === "Задержка и нерегулярный цикл") {
    return buildPersonalForecastLine(context, prediction);
  }
  return "";
}

function shouldUseContext(title: string, query: string) {
  return (
    title === "Расчёт следующей даты" ||
    title === "Текущая фаза" ||
    title === "Симптомы и дневник" ||
    title === "Задержка и нерегулярный цикл" ||
    query.includes("мой") ||
    query.includes("сегодня") ||
    query.includes("у меня")
  );
}
