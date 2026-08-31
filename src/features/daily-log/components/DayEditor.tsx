import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Heart, X } from "lucide-react";
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
  WellbeingLevel
} from "../../../types";
import { getCalendarDayInfo } from "../../cycle/domain/cycleCalculations";

interface Props {
  date: string;
  compact?: boolean;
  onClose?: () => void;
  onDateChange?: (date: string) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}

const moods = ["good", "calm", "energetic", "sensitive", "changeable", "irritated", "anxious", "sad"] as const;
const wellbeing = ["very-bad", "bad", "normal", "good", "excellent"] as const;
const energyLevels = ["very-low", "low", "normal", "high", "very-high"] as const;

const moodEmojis: Record<Mood, string> = {
  good: "🙂", calm: "😌", energetic: "🤩", sensitive: "🥺", changeable: "🎢", irritated: "😤", anxious: "😰", sad: "😢",
  happy: "😊", tired: "😴", tense: "😬"
};

const shortMoodNames: Record<Mood, string> = {
  good: "Хорошо",
  calm: "Спокойно",
  energetic: "Энергия",
  sensitive: "Нежность",
  changeable: "Качели",
  irritated: "Злость",
  anxious: "Тревога",
  sad: "Грусть",
  happy: "Радость",
  tired: "Усталость",
  tense: "Стресс"
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
  if (value === 0) return "нет";
  if (value <= 3) return "слабая";
  if (value <= 6) return "умеренная";
  if (value <= 8) return "сильная";
  return "очень сильная";
}

export function DayEditor({ date, compact = false, onClose, onDateChange, onPrevDay, onNextDay }: Props) {
  const { cycles, profile, dailyLogs, saveDailyLog, deleteDailyLogByDate } = useAppStore();
  const existing = useMemo(() => dailyLogs.find((log) => log.date === date), [dailyLogs, date]);
  const info = getCalendarDayInfo(date, cycles, profile?.averageCycleLength, profile?.averagePeriodLength);

  const [flow, setFlow] = useState<FlowLevel>(existing?.flow ?? "none");
  const [mood, setMood] = useState<Mood | "">(existing?.mood ?? "");
  const [wellbeingValue, setWellbeingValue] = useState<WellbeingLevel | "">(existing?.wellbeing ?? "");
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [customSymptom, setCustomSymptom] = useState(existing?.customSymptom ?? "");
  const [painLevel, setPainLevel] = useState(existing?.painLevel ?? existing?.pain ?? 0);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "">(existing?.energyLevel ?? "");
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? 7.5);
  const [intimacy, setIntimacy] = useState<IntimacyLog>(existing?.intimacy ?? emptyIntimacy());
  const [note, setNote] = useState(existing?.note ?? "");

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
      moodChangedDuringDay: false,
      wellbeing: wellbeingValue || undefined,
      flow,
      symptoms,
      customSymptom: symptoms.includes("другое") ? customSymptom.trim() : undefined,
      pain: painLevel,
      painLevel,
      energyLevel: energyLevel || undefined,
      sleepQuality: sleepHours >= 8 ? "good" : sleepHours >= 6 ? "normal" : "bad",
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
      className={cn("flex flex-1 min-h-0 flex-col overflow-hidden text-text", compact ? "bg-card" : "bg-transparent")}
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

      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-1 pt-2 pb-2.5 border-b border-border/40 shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {format(parseISO(date), "d MMMM yyyy", { locale: localeRu })}
            </h2>
            <p className="text-xs text-muted font-medium">
              {info.cycleDay}-й день цикла · {ru.phase[info.phase]}
            </p>
          </div>
        </div>

        {onPrevDay && onNextDay ? (
          <div className="flex items-center gap-1 shrink-0 bg-card/80 border border-border/60 rounded-2xl p-1 shadow-sm">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl" onClick={onPrevDay} aria-label="Предыдущий день">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <label className="relative flex items-center justify-center px-1.5 py-0.5 rounded-xl hover:bg-primarySoft cursor-pointer text-xs font-semibold">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && onDateChange?.(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl" onClick={onNextDay} aria-label="Следующий день">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : onClose ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Закрыть" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      {/* Scrollable / Form Content */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-1 py-2.5 space-y-3 overscroll-contain">
        {/* 1. Месячные / Выделения */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Месячные (выделения)</p>
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
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-center transition active:scale-95",
                  flow === item.val
                    ? "bg-primary text-white font-semibold shadow-sm"
                    : "bg-card/90 border border-border/60 text-muted hover:text-text"
                )}
              >
                <span className="text-sm">{item.emoji}</span>
                <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Половой акт */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Половой акт</p>
          <div className="grid grid-cols-3 gap-1.5">
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
                    "flex items-center justify-center gap-1.5 py-2 px-2 rounded-2xl text-xs transition active:scale-95",
                    active
                      ? "bg-primary text-white font-semibold shadow-sm"
                      : "bg-card/90 border border-border/60 text-muted hover:text-text"
                  )}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Настроение */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Настроение</p>
          <div className="grid grid-cols-4 gap-1.5">
            {moods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setMood(mood === item ? "" : item); markDirty(); }}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-center transition active:scale-95",
                  mood === item
                    ? "bg-primary text-white font-semibold shadow-sm"
                    : "bg-card/90 border border-border/60 text-muted hover:text-text"
                )}
              >
                <span className="text-base">{moodEmojis[item]}</span>
                <span className="text-[10px] mt-0.5 leading-tight">{shortMoodNames[item] || ru.mood[item]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Самочувствие и Энергия */}
        <div className="grid grid-cols-2 gap-2">
          {/* Самочувствие */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Самочувствие</p>
            <div className="grid grid-cols-5 gap-1">
              {wellbeing.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setWellbeingValue(wellbeingValue === item ? "" : item); markDirty(); }}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl text-center transition active:scale-95",
                    wellbeingValue === item
                      ? "bg-primary text-white font-semibold shadow-sm"
                      : "bg-card/90 border border-border/60 text-muted hover:text-text"
                  )}
                  title={ru.wellbeing[item]}
                >
                  <span className="text-base">{wellbeingEmojis[item]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Энергия */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Энергия</p>
            <div className="grid grid-cols-5 gap-1">
              {energyLevels.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setEnergyLevel(energyLevel === item ? "" : item); markDirty(); }}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl text-center transition active:scale-95",
                    energyLevel === item
                      ? "bg-primary text-white font-semibold shadow-sm"
                      : "bg-card/90 border border-border/60 text-muted hover:text-text"
                  )}
                  title={ru.energy[item]}
                >
                  <span className="text-base">{energyEmojis[item]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Симптомы */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Симптомы</p>
          <div className="flex flex-wrap gap-1">
            {ru.symptoms.map((symptom) => {
              const isSelected = symptoms.includes(symptom);
              return (
                <button
                  key={symptom}
                  type="button"
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-[11px] font-medium transition active:scale-95",
                    isSelected
                      ? "bg-primary text-white font-semibold shadow-sm"
                      : "bg-card/90 border border-border/60 text-muted hover:text-text"
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
              className="mt-1 text-xs h-8 rounded-xl"
              value={customSymptom}
              maxLength={100}
              placeholder="Укажите другой симптом"
              onChange={(event) => { setCustomSymptom(event.target.value); markDirty(); }}
            />
          )}
        </div>

        {/* 6. Боль и Сон */}
        <div className="grid grid-cols-2 gap-2">
          {/* Боль */}
          <div className="space-y-1 rounded-2xl bg-card/90 p-2 border border-border/60">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted">Боль</span>
              <span>{painLevel}/10 ({painText(painLevel)})</span>
            </div>
            <input
              className="w-full accent-primary h-1.5 bg-primarySoft rounded-lg cursor-pointer"
              type="range"
              min={0}
              max={10}
              value={painLevel}
              onChange={(event) => { setPainLevel(clamp(Number(event.target.value), 0, 10)); markDirty(); }}
            />
          </div>

          {/* Сон */}
          <div className="space-y-1 rounded-2xl bg-card/90 p-2 border border-border/60">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted">Сон</span>
              <span>{sleepHours} ч</span>
            </div>
            <input
              className="w-full accent-primary h-1.5 bg-primarySoft rounded-lg cursor-pointer"
              type="range"
              min={0}
              max={14}
              step={0.5}
              value={sleepHours}
              onChange={(event) => { setSleepHours(clamp(Number(event.target.value), 0, 14)); markDirty(); }}
            />
          </div>
        </div>

        {/* 7. Заметка дня */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Заметка дня</p>
          <Textarea
            value={note}
            maxLength={1000}
            placeholder="Запиши то, что захочется вспомнить позже..."
            className="text-xs min-h-[45px] rounded-2xl border-border/60 bg-card/90"
            onChange={(event) => { setNote(event.target.value); markDirty(); }}
          />
        </div>

        {error && <p className="rounded-2xl bg-coral/10 p-2.5 text-xs text-coral">{error}</p>}
      </div>

      {/* Action Buttons */}
      <footer className="sticky bottom-0 z-20 flex items-center gap-2.5 pt-2 pb-1 px-0.5 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0">
        <Button
          className="flex-1 min-h-12 text-sm font-bold rounded-2xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 text-white hover:brightness-105 active:scale-[0.98] transition-all"
          onClick={() => void save()}
        >
          {existing ? "Сохранить изменения" : "Сохранить день"}
        </Button>
        {existing && (
          <Button variant="outline" className="min-h-12 px-4 text-xs rounded-2xl border-border/70 hover:bg-card" onClick={() => void clear()}>
            Очистить
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" className="min-h-12 px-4 text-xs rounded-2xl hover:bg-card/60" onClick={close}>
            Отмена
          </Button>
        )}
      </footer>
    </section>
  );
}
