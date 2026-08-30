import { ChevronDown, Heart, X } from "lucide-react";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { Input, Textarea } from "../../../components/ui/field";
import { ru } from "../../../i18n/ru";
import { clamp, cn } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import type {
  EnergyLevel,
  FlowLevel,
  IntimacyLog,
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
  
  const [flow, setFlow] = useState<FlowLevel>(existing?.flow ?? "none");
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
  
  const hasExtraData = Boolean(
    existing?.mood ||
    existing?.wellbeing ||
    (existing?.symptoms && existing.symptoms.length > 0) ||
    existing?.pain ||
    existing?.painLevel ||
    existing?.energyLevel ||
    existing?.sleepQuality ||
    existing?.note
  );
  const [showExtra, setShowExtra] = useState(hasExtraData);

  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState<string | null>(null);

  function markDirty() {
    setDirty(true);
  }

  function toggleSymptom(symptom: string) {
    markDirty();
    setSymptoms((current) => (current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]));
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
      note: note.trim() || undefined
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
      className="flex flex-col max-h-[88dvh] overflow-hidden bg-card text-text"
    >
      <AnimatePresence>
        {insight && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-12 left-1/2 z-50 flex w-[90%] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl bg-card p-4 shadow-xl border border-primary/20"
          >
            <Heart className="mt-0.5 h-5 w-5 shrink-0 text-coral" fill="currentColor" />
            <p className="text-sm font-medium leading-relaxed">{insight}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/60 shrink-0">
        <div>
          <p className="text-xs text-muted font-medium">{format(parseISO(date), "d MMMM yyyy", { locale: localeRu })}</p>
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            {info.cycleDay}-й день цикла · {ru.phase[info.phase]}
          </h2>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Закрыть" onClick={close}>
            <X className="h-5 w-5" />
          </Button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
        {/* 1. Месячные / Выделения */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted">Месячные (выделения)</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { val: "none", label: "Нет", emoji: "⚪" },
              { val: "spotting", label: "Мазки", emoji: "💧" },
              { val: "light", label: "Мало", emoji: "🩸" },
              { val: "medium", label: "Средне", emoji: "🩸🩸" },
              { val: "heavy", label: "Обильно", emoji: "🩸🩸🩸" }
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => { setFlow(item.val as FlowLevel); markDirty(); }}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition active:scale-95",
                  flow === item.val
                    ? "bg-primary text-white font-semibold shadow-sm"
                    : "bg-primarySoft/60 text-muted hover:text-text"
                )}
              >
                <span className="text-sm">{item.emoji}</span>
                <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Половой акт */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted">Половой акт</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "none", label: "Не было", icon: "—" },
              { val: "protected", label: "С защитой", icon: "🛡️" },
              { val: "unprotected", label: "Без защиты", icon: "❤️" }
            ].map((item) => {
              const active =
                item.val === "none"
                  ? intimacy.occurred === false
                  : item.val === "protected"
                    ? intimacy.occurred === true && intimacy.protection === "used"
                    : intimacy.occurred === true && intimacy.protection === "not-used";
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => {
                    if (item.val === "none") {
                      setIntimacy({ occurred: false });
                    } else if (item.val === "protected") {
                      setIntimacy({ occurred: true, protection: "used" });
                    } else {
                      setIntimacy({ occurred: true, protection: "not-used" });
                    }
                    markDirty();
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs transition active:scale-95",
                    active
                      ? "bg-primary text-white font-semibold shadow-sm"
                      : "bg-primarySoft/60 text-muted hover:text-text"
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Кнопка Дополнительно */}
        <button
          type="button"
          onClick={() => setShowExtra((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl bg-primarySoft/70 px-3.5 py-2.5 text-xs font-semibold text-primary transition active:scale-[0.98]"
        >
          <span>{showExtra ? "Скрыть дополнительные поля" : "+ Дополнительно (симптомы, настроение, сон, заметка)"}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showExtra && "rotate-180")} />
        </button>

        {/* 4. Раскрывающийся блок */}
        <AnimatePresence>
          {showExtra && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-1 overflow-hidden"
            >
              {/* Настроение */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted">Настроение</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {moods.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => { setMood(item); markDirty(); }}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition active:scale-95",
                        mood === item
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "bg-primarySoft/60 text-muted hover:text-text"
                      )}
                    >
                      <span className="text-lg">{moodEmojis[item]}</span>
                      <span className="text-[10px] mt-0.5 leading-tight">{ru.mood[item]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Самочувствие */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted">Общее самочувствие</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {wellbeing.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => { setWellbeingValue(item); markDirty(); }}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition active:scale-95",
                        wellbeingValue === item
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "bg-primarySoft/60 text-muted hover:text-text"
                      )}
                    >
                      <span className="text-lg">{wellbeingEmojis[item]}</span>
                      <span className="text-[10px] mt-0.5 leading-tight">{ru.wellbeing[item]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Симптомы */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted">Симптомы</p>
                <div className="flex flex-wrap gap-1.5">
                  {ru.symptoms.map((symptom) => {
                    const isSelected = symptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition active:scale-95",
                          isSelected
                            ? "bg-primary text-white font-semibold shadow-sm"
                            : "bg-primarySoft/60 text-muted hover:text-text"
                        )}
                        onClick={() => toggleSymptom(symptom)}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
                {symptoms.includes("другое") && (
                  <Input
                    className="mt-2 text-xs"
                    value={customSymptom}
                    maxLength={100}
                    placeholder="Укажите другой симптом"
                    onChange={(event) => { setCustomSymptom(event.target.value); markDirty(); }}
                  />
                )}
              </div>

              {/* Боль */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted">Уровень боли</span>
                  <span>{painLevel}/10 · {painText(painLevel)}</span>
                </div>
                <input
                  className="w-full accent-primary h-2 bg-primarySoft rounded-lg cursor-pointer"
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(event) => { setPainLevel(clamp(Number(event.target.value), 0, 10)); markDirty(); }}
                />
              </div>

              {/* Сон и энергия */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted">Энергия</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {energyLevels.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => { setEnergyLevel(item); markDirty(); }}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition active:scale-95",
                        energyLevel === item
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "bg-primarySoft/60 text-muted hover:text-text"
                      )}
                    >
                      <span className="text-base">{energyEmojis[item]}</span>
                      <span className="text-[10px] mt-0.5 leading-tight">{ru.energy[item]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted">Сон, часов</span>
                  <span>{sleepHours} ч</span>
                </div>
                <input
                  className="w-full accent-primary h-2 bg-primarySoft rounded-lg cursor-pointer"
                  type="range"
                  min={0}
                  max={16}
                  step={0.5}
                  value={sleepHours}
                  onChange={(event) => { setSleepHours(clamp(Number(event.target.value), 0, 16)); markDirty(); }}
                />
              </div>

              {/* Заметка дня */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted">Заметка дня</p>
                <Textarea
                  value={note}
                  maxLength={1000}
                  placeholder="Запиши то, что захочется вспомнить позже..."
                  className="text-xs min-h-[70px]"
                  onChange={(event) => { setNote(event.target.value); markDirty(); }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="rounded-xl bg-coral/10 p-2.5 text-xs text-coral">{error}</p>}
      </div>

      <footer className="flex gap-2.5 border-t border-border/60 bg-card p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shrink-0">
        <Button className="flex-1 min-h-11 text-sm font-semibold rounded-2xl shadow-md" onClick={() => void save()}>
          {existing ? "Сохранить изменения" : "Сохранить день"}
        </Button>
        {existing && (
          <Button variant="outline" className="min-h-11 text-xs rounded-2xl" onClick={() => void clear()}>
            Очистить
          </Button>
        )}
        <Button variant="ghost" className="min-h-11 text-xs rounded-2xl" onClick={onClose ? close : () => setDirty(false)}>
          Отмена
        </Button>
      </footer>
    </section>
  );
}
