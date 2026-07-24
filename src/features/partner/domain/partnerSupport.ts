import type { CyclePhase, DailyLog, PartnerSupportCard, PartnerSupportPreferences, PartnerVisibleDay } from "../../../types";
import { frequentSymptoms } from "../../cycle/domain/cycleReports";

const phaseSupport: Record<CyclePhase, string> = {
  menstrual: "Можно мягко предложить отдых, тепло или помощь с бытовыми делами. Лучше спросить, что сейчас действительно уместно.",
  follicular: "Подойдёт спокойное участие без давления: спросить о планах и предложить помощь, если она нужна.",
  fertile: "Это только календарная подсказка. Лучшее действие — уважительное общение и отсутствие выводов за неё.",
  ovulation: "Прогноз овуляции приблизительный. Поддержка здесь — не контроль, а внимательность и уважение границ.",
  luteal: "Можно предложить заранее упростить вечер, не перегружать планами и оставить пространство, если оно нужно."
};

export function buildPartnerSupportCard({
  today,
  phase,
  logs,
  preferences
}: {
  today?: PartnerVisibleDay;
  phase?: CyclePhase;
  logs: DailyLog[];
  preferences?: PartnerSupportPreferences;
}): PartnerSupportCard {
  const selectedPreference = preferences?.preferredSupport.find(Boolean);
  if (selectedPreference) {
    return {
      title: "Как поддержать сегодня",
      body: `Она заранее отметила, что ей может помочь: ${selectedPreference}. Лучше предложить это спокойно, без давления.`,
      actions: [
        "Спросить, подходит ли такая помощь сейчас",
        preferences?.reassuranceText || "Напомнить, что можно честно сказать, чего хочется",
        preferences?.avoidWhenPossible ? `Избегать: ${preferences.avoidWhenPossible}` : "Не настаивать, если она выберет тишину"
      ],
      source: "preferences"
    };
  }

  if (today?.painLevel !== undefined && today.painLevel >= 7) {
    return {
      title: "Сегодня может быть нужна бережность",
      body: "Отмечена сильная боль. LunaPair не объясняет её причину и не ставит диагнозы, но можно предложить практическую помощь и быть рядом.",
      actions: [
        "Спросить, чем помочь прямо сейчас",
        "Предложить взять на себя бытовую мелочь",
        "Если боль необычная или пугающая, поддержать обращение к специалисту"
      ],
      source: "today-log"
    };
  }

  if (today?.energy === "very-low" || today?.energy === "low" || today?.sleepQuality === "bad") {
    return {
      title: "Поддержка без давления",
      body: "Сегодня отмечены низкая энергия или непростой сон. Это не диагноз и не причина делать выводы за неё.",
      actions: [
        "Спросить, нужен ли более спокойный вечер",
        "Предложить еду, воду или помощь с делами",
        "Оставить пространство, если она попросит"
      ],
      source: "today-log"
    };
  }

  const frequent = frequentSymptoms(logs)[0];
  if (frequent) {
    return {
      title: "Осторожное наблюдение",
      body: `В разрешённых записях иногда повторяется: ${frequent}. Это наблюдение, а не объяснение самочувствия.`,
      actions: [
        "Не связывать всё автоматически с циклом",
        "Спросить, актуально ли это сегодня",
        "Предложить помощь и принять любой ответ"
      ],
      source: "pattern"
    };
  }

  if (phase) {
    return {
      title: "Мягкая подсказка по фазе",
      body: phaseSupport[phase],
      actions: ["Спросить о самочувствии", "Предложить поддержку конкретно", "Уважать личные границы"],
      source: "phase"
    };
  }

  return {
    title: "Лучшее начало — вопрос",
    body: "Сегодня нет открытых данных о самочувствии. Самая спокойная поддержка — спросить, как она и нужна ли помощь.",
    actions: ["Спросить без ожидания конкретного ответа", "Не делать выводы по календарю", "Дать пространство"],
    source: "general"
  };
}
