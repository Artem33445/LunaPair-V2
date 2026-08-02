import { X, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { FieldLabel, Input, Textarea } from "../../../components/ui/field";
import { ru } from "../../../i18n/ru";
import { clamp } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import type {
  EnergyLevel,
  FlowLevel,
  IntimacyAfterFeeling,
  IntimacyLog,
  IntimacyType,
  Mood,
  ProtectionStatus,
  SleepQuality,
  WellbeingLevel
} from "../../../types";
import { getCalendarDayInfo } from "../../cycle/domain/cycleCalculations";

interface Props {
  date: string;
  compact?: boolean;
  onClose?: () => void;
}

const moods = ["good", "calm", "energetic", "sensitive", "changeable", "irritated", "anxious", "sad"] as const;
const wellbeing = ["very-bad", "bad", "normal", "good", "excellent"] as const;
const energyLevels = ["very-low", "low", "normal", "high", "very-high"] as const;
const sleepQuality = ["bad", "normal", "good"] as const;

const moodTranslations: Record<Mood, string> = {
  good: "Хорошее",
  calm: "Спокойное",
  energetic: "Энергичное",
  happy: "Счастливое",
  tired: "Усталое",
  tense: "Напряжённое",
  sensitive: "Чувствительное",
  changeable: "Переменчивое",
  irritated: "Раздражённое",
  anxious: "Тревожное",
  sad: "Грустное"
};
const moodEmojis: Record<Mood, string> = {
  good: "🙂", calm: "😌", energetic: "🤩", sensitive: "🥺", changeable: "🎢", irritated: "😤", anxious: "😰", sad: "😢",
  happy: "😊", tired: "😴", tense: "😬"
};
const wellbeingEmojis: Record<WellbeingLevel, string> = {
  "very-bad": "🤒", bad: "🤕", normal: "😐", good: "🙂", excellent: "🤩"
};
const energyEmojis: Record<EnergyLevel, string> = {
  "very-low": "🪫", low: "🔋", normal: "⚡", high: "🚀", "very-high": "🔥"
};
const flowEmojis: Record<FlowLevel, string> = {
  none: "⚪", spotting: "💧", light: "🩸", medium: "🩸🩸", heavy: "🩸🩸🩸"
};

function emptyIntimacy(): IntimacyLog {
  return { occurred: null };
}

function painText(value: number) {
  if (value === 0) return "нет боли";
  if (value <= 3) return "слабая";
  if (value <= 6) return "умеренная";
  if (value <= 8) return "сильная";
  return "очень сильная";
}

export function DayEditor({ date, compact = false, onClose }: Props) {
  const { cycles, profile, dailyLogs, saveDailyLog, deleteDailyLogByDate } = useAppStore();
  const existing = useMemo(() => dailyLogs.find((log) => log.date === date), [dailyLogs, date]);
  const info = getCalendarDayInfo(date, cycles, profile?.averageCycleLength, profile?.averagePeriodLength);
  
  const [flow, setFlow] = useState<FlowLevel>(existing?.flow ?? "spotting");
  const [mood, setMood] = useState<Mood | "">(existing?.mood ?? "");
  const [moodChangedDuringDay, setMoodChangedDuringDay] = useState(existing?.moodChangedDuringDay ?? false);
  const [wellbeingValue, setWellbeingValue] = useState<WellbeingLevel | "">(existing?.wellbeing ?? "");
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [customSymptom, setCustomSymptom] = useState(existing?.customSymptom ?? "");
  const [painLevel, setPainLevel] = useState(existing?.painLevel ?? existing?.pain ?? 0);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "">(existing?.energyLevel ?? "");
  const [sleepValue, setSleepValue] = useState<SleepQuality | "">(existing?.sleepQuality ?? "");
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? 7);
  const [intimacy, setIntimacy] = useState<IntimacyLog>(existing?.intimacy ?? emptyIntimacy());
  const [note, setNote] = useState(existing?.note ?? "");
  const [hiddenFromPartner, setHiddenFromPartner] = useState(existing?.hiddenFromPartner ?? false);
  const [noteVisibleToPartner, setNoteVisibleToPartner] = useState(existing?.noteVisibleToPartner ?? false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState<string | null>(null);

  function markDirty() {
    setDirty(true);
  }

  function triggerInsight(key: string) {
    if (key in ru.assistantInsights) {
      setInsight((ru.assistantInsights as any)[key]);
      setTimeout(() => setInsight(null), 5000);
    }
  }

  function toggleSymptom(symptom: string) {
    markDirty();
    setSymptoms((current) => (current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]));
    // Map symptom to insight key if possible
    if (symptom === "усталость") triggerInsight("tired");
    if (symptom === "спазмы") triggerInsight("cramps");
  }

  function close() {
    if (dirty && !confirm("Закрыть без сохранения изменений?")) return;
    onClose?.();
  }

  async function save() {
    if (note.length > 1000) {
      setError("Описание дня не должно превышать 1000 символов");
      return;
    }
    if (customSymptom.length > 100) {
      setError("Поле «другое» не должно превышать 100 символов");
      return;
    }
    if ((intimacy.note?.length ?? 0) > 300) {
      setError("Приватная заметка не должна превышать 300 символов");
      return;
    }
    setError("");
    await saveDailyLog({
      date,
      mood: mood || undefined,
      moodChangedDuringDay,
      wellbeing: wellbeingValue || undefined,
      flow,
      symptoms,
      customSymptom: symptoms.includes("другое") ? customSymptom.trim() : undefined,
      pain: painLevel,
      painLevel,
      energyLevel: energyLevel || undefined,
      sleepQuality: sleepValue || undefined,
      sleepHours,
      intimacy,
      note: note.trim() || undefined,
      hiddenFromPartner,
      noteVisibleToPartner: !hiddenFromPartner && Boolean(note.trim()) && noteVisibleToPartner
    });
    setDirty(false);
    onClose?.();
  }

  async function clear() {
    if (!confirm("Очистить запись за этот день? Отметки месячных в циклах не будут удалены.")) return;
    await deleteDailyLogByDate(date);
    setDirty(false);
    onClose?.();
  }

  return (
    <section
      role={compact ? "dialog" : undefined}
      aria-modal={compact ? "true" : undefined}
      className={compact ? "mobile-sheet overflow-y-auto rounded-t-card bg-card p-4 shadow-soft sm:p-5 md:max-h-[82vh] md:rounded-card relative" : "space-y-5 relative"}
    >
      <AnimatePresence>
        {insight && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 z-50 flex w-[90%] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl bg-card p-4 shadow-xl border border-primary/20"
          >
            <Sparkles className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium leading-relaxed">{insight}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="-mx-4 -mt-4 mb-4 flex items-start justify-between gap-3 border-b border-border bg-card/95 p-4 sm:-mx-5 sm:-mt-5 sm:p-5">
        <div>
          <p className="text-sm text-muted">{format(parseISO(date), "d MMMM yyyy", { locale: localeRu })}</p>
          <h2 className="text-xl font-bold">
            {info.cycleDay}-й день цикла · {ru.phase[info.phase]}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {info.isPredictedPeriod ? "Дата входит в прогноз месячных · " : ""}
            {existing ? "есть сохранённая запись" : "записи пока нет"}
          </p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" aria-label="Закрыть" onClick={close}>
            <X className="h-5 w-5" />
          </Button>
        ) : null}
      </header>

      <div className="space-y-5">
        <FieldSet title="Месячные">
          <SegmentedGrid value={flow} values={["spotting", "none", "light", "medium", "heavy"]} labels={ru.flow} emojis={flowEmojis} onChange={(value) => { setFlow(value as FlowLevel); markDirty(); }} />
        </FieldSet>

        <FieldSet title="Настроение">
          <SegmentedGrid value={mood} values={moods} labels={ru.mood} emojis={moodEmojis} onChange={(value) => { setMood(value as Mood); markDirty(); triggerInsight(value); }} />
          <label className="mt-3 flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={moodChangedDuringDay} onChange={(event) => { setMoodChangedDuringDay(event.target.checked); markDirty(); }} />
            Настроение сильно менялось в течение дня
          </label>
        </FieldSet>

        <FieldSet title="Самочувствие">
          <SegmentedGrid value={wellbeingValue} values={wellbeing} labels={ru.wellbeing} emojis={wellbeingEmojis} onChange={(value) => { setWellbeingValue(value as WellbeingLevel); markDirty(); }} />
        </FieldSet>

        <FieldSet title="Основные симптомы">
          <div className="flex flex-wrap gap-2">
            {ru.symptoms.map((symptom) => {
              const isSelected = symptoms.includes(symptom);
              return (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={symptom}
                  type="button"
                  className={`min-h-11 rounded-full border px-4 py-1 text-sm font-medium transition-colors ${isSelected ? "border-primary bg-primary text-card shadow-sm" : "border-border bg-card hover:bg-elevated text-text"}`}
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </motion.button>
              );
            })}
          </div>
          {symptoms.includes("другое") ? (
            <Input className="mt-3" value={customSymptom} maxLength={100} placeholder="Коротко, до 100 символов" onChange={(event) => { setCustomSymptom(event.target.value); markDirty(); }} />
          ) : null}
        </FieldSet>

        <FieldSet title="Боль">
          <label className="flex items-center justify-between text-sm font-semibold">
            <span>Уровень боли</span>
            <span>{painLevel}/10 · {painText(painLevel)}</span>
          </label>
          <input className="mt-2 w-full accent-primary" type="range" min={0} max={10} value={painLevel} onChange={(event) => { setPainLevel(clamp(Number(event.target.value), 0, 10)); markDirty(); }} />
          {painLevel >= 7 ? <p className="mt-2 rounded-2xl bg-coral/10 p-3 text-sm text-coral">Сильная или необычная боль может требовать консультации медицинского специалиста.</p> : null}
        </FieldSet>

        <FieldSet title="Сон и энергия">
          <SegmentedGrid value={energyLevel} values={energyLevels} labels={ru.energy} emojis={energyEmojis} onChange={(value) => { setEnergyLevel(value as EnergyLevel); markDirty(); }} />
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">Качество сна</p>
            <SegmentedRow value={sleepValue} values={sleepQuality} labels={ru.sleepQuality} onChange={(value) => { setSleepValue(value as SleepQuality); markDirty(); }} />
          </div>
          <label className="mt-4 flex items-center justify-between text-sm font-semibold">
            <span>Сон, часов</span>
            <span>{sleepHours}</span>
          </label>
          <input className="mt-2 w-full accent-primary" type="range" min={0} max={16} step={0.5} value={sleepHours} onChange={(event) => { setSleepHours(clamp(Number(event.target.value), 0, 16)); markDirty(); }} />
        </FieldSet>

        <FieldSet title="Интимная близость">
          <p className="mb-3 text-sm text-muted">Приватный раздел. По умолчанию эти данные не видны партнёру.</p>
          <SegmentedRow
            value={intimacy.occurred === null ? "unset" : intimacy.occurred ? "yes" : "no"}
            values={["unset", "no", "yes"]}
            labels={ru.intimacy.occurred}
            onChange={(value) => {
              setIntimacy(value === "unset" ? { occurred: null } : { ...intimacy, occurred: value === "yes" });
              markDirty();
            }}
          />
          {intimacy.occurred ? (
            <div className="mt-4 space-y-4">
              <SelectField label="Тип" value={intimacy.type ?? "prefer-not-to-say"} values={["penetrative", "non-penetrative", "prefer-not-to-say"]} labels={ru.intimacy.type} onChange={(value) => { setIntimacy({ ...intimacy, type: value as IntimacyType }); markDirty(); }} />
              <SelectField label="Защита" value={intimacy.protection ?? "prefer-not-to-say"} values={["used", "not-used", "prefer-not-to-say"]} labels={ru.intimacy.protection} onChange={(value) => { setIntimacy({ ...intimacy, protection: value as ProtectionStatus }); markDirty(); }} />
              <SelectField label="Самочувствие после" value={intimacy.afterFeeling ?? "fine"} values={["fine", "discomfort", "pain", "note-only"]} labels={ru.intimacy.afterFeeling} onChange={(value) => { setIntimacy({ ...intimacy, afterFeeling: value as IntimacyAfterFeeling }); markDirty(); }} />
              <Textarea value={intimacy.note ?? ""} maxLength={300} placeholder="Приватная заметка, до 300 символов" onChange={(event) => { setIntimacy({ ...intimacy, note: event.target.value }); markDirty(); }} />
            </div>
          ) : null}
        </FieldSet>

        <FieldSet title="Описание дня">
          <FieldLabel htmlFor={`note-${date}`}>Описание дня</FieldLabel>
          <Textarea id={`note-${date}`} value={note} maxLength={1000} placeholder="Запиши то, что захочется вспомнить позже" onChange={(event) => { setNote(event.target.value); markDirty(); }} />
          <p className="text-xs text-muted">{note.length}/1000</p>
          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-primarySoft p-3 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-primary"
                checked={hiddenFromPartner}
                onChange={(event) => {
                  setHiddenFromPartner(event.target.checked);
                  markDirty();
                }}
              />
              <span>
                <span className="block font-semibold">Скрыть этот день от партнёра</span>
                <span className="text-muted">Партнёр увидит только дату без самочувствия, заметок и маркеров.</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-primary"
                checked={noteVisibleToPartner}
                disabled={!note.trim() || hiddenFromPartner}
                onChange={(event) => {
                  setNoteVisibleToPartner(event.target.checked);
                  markDirty();
                }}
              />
              <span>
                <span className="block font-semibold">Открыть эту заметку партнёру</span>
                <span className="text-muted">Заметка появится в партнёрском режиме только если общий доступ к комментариям включён в профиле.</span>
              </span>
            </label>
          </div>
        </FieldSet>

        {error ? <p className="rounded-2xl bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

        <footer className="-mx-4 -mb-4 flex flex-col gap-3 border-t border-border bg-card/95 p-4 pb-[max(1rem,var(--safe-bottom))] sm:-mx-5 sm:-mb-5 sm:flex-row sm:p-5 sm:pb-5">
          <Button className="flex-1" onClick={() => void save()}>
            {existing ? "Сохранить изменения" : "Сохранить день"}
          </Button>
          {existing ? <Button variant="outline" onClick={() => void clear()}>Очистить</Button> : null}
          <Button variant="ghost" onClick={onClose ? close : () => setDirty(false)}>Отмена</Button>
        </footer>
      </div>
    </section>
  );
}

function FieldSet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card/80 p-5 glass-panel">
      <h3 className="mb-4 font-bold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function SegmentedGrid<T extends string>({
  value,
  values,
  labels,
  emojis,
  onChange
}: {
  value: string;
  values: readonly T[];
  labels: Record<T, string>;
  emojis: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {values.map((item) => (
        <motion.button
          whileTap={{ scale: 0.95 }}
          key={item}
          type="button"
          aria-pressed={value === item}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition-all ${value === item ? "border-primary bg-primarySoft text-primary shadow-sm" : "border-border bg-card text-muted hover:bg-elevated hover:text-text"}`}
          onClick={() => onChange(item)}
        >
          <span className="text-2xl">{emojis[item]}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">{labels[item]}</span>
        </motion.button>
      ))}
    </div>
  );
}

function SegmentedRow<T extends string>({
  value,
  values,
  labels,
  onChange
}: {
  value: string;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <motion.button
          whileTap={{ scale: 0.95 }}
          key={item}
          type="button"
          aria-pressed={value === item}
          className={`min-h-11 rounded-full border px-4 py-1 text-sm font-medium transition-colors ${value === item ? "border-primary bg-primary text-card shadow-sm" : "border-border bg-card text-muted hover:bg-elevated hover:text-text"}`}
          onClick={() => onChange(item)}
        >
          {labels[item]}
        </motion.button>
      ))}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  values,
  labels,
  onChange
}: {
  label: string;
  value: T;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select className="mt-2 min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-base" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {values.map((item) => (
          <option key={item} value={item}>
            {labels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
