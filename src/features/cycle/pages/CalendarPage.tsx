import { addDays, addMonths, differenceInCalendarDays, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui/button";
import { ru } from "../../../i18n/ru";
import { cn } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import { getCalendarDayInfo, isDateInRange, pluralDays } from "../domain/cycleCalculations";
import { DayEditor } from "../../daily-log/components/DayEditor";
import { MagicBento } from "../../../components/ui/MagicBento";
import type { CycleEntry } from "../../../types";

const phaseAccent = {
  menstrual: "bg-[hsl(var(--phase-menstrual)/0.7)]",
  follicular: "bg-[hsl(var(--phase-follicular)/0.48)]",
  fertile: "bg-[hsl(var(--phase-fertile)/0.58)]",
  ovulation: "bg-[hsl(var(--phase-ovulation)/0.7)]",
  luteal: "bg-[hsl(var(--phase-luteal)/0.48)]"
};

export function CalendarPage() {
  const { cycles, profile, dailyLogs, updatePeriodStartDate, endPeriod } = useAppStore();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [legendOpen, setLegendOpen] = useState(false);
  const [periodStartModalOpen, setPeriodStartModalOpen] = useState(false);
  const [periodEndModalOpen, setPeriodEndModalOpen] = useState(false);
  const today = new Date();

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [cycles]
  );
  const latestCycle = sortedCycles.at(-1);

  const relevantCycle = useMemo(() => {
    if (selectedDate) {
      const match = sortedCycles.find((c) =>
        isDateInRange(selectedDate, c.startDate, c.endDate ?? addDays(parseISO(c.startDate), 14))
      );
      if (match) return match;
    }
    return latestCycle;
  }, [sortedCycles, selectedDate, latestCycle]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [month]);

  function goToday() {
    setMonth(startOfMonth(today));
    setSelectedDate(format(today, "yyyy-MM-dd"));
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* ========================================================================= */}
      {/* DESKTOP CALENDAR (>= md): Fullscreen MagicBento, Glowing Cards, 60fps      */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-1 flex-col pb-2 pt-3 overflow-hidden">
        {/* Desktop Header */}
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold capitalize tracking-tight">
              {format(month, "LLLL yyyy", { locale: localeRu })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Предыдущий месяц"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setMonth(addMonths(month, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 px-3 text-xs rounded-xl font-medium" onClick={goToday}>
                Сегодня
              </Button>
              <Button
                aria-label="Следующий месяц"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setMonth(addMonths(month, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Button
              aria-expanded={legendOpen}
              variant="ghost"
              className="text-xs h-8 px-3 text-muted hover:text-text font-medium"
              onClick={() => setLegendOpen((open) => !open)}
            >
              Обозначения
            </Button>
            {legendOpen ? <Legend onClose={() => setLegendOpen(false)} /> : null}
          </div>
        </div>

        {/* Desktop Days of Week */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted mb-1 px-1">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <span key={day} className={cn((day === "Сб" || day === "Вс") && "text-[hsl(var(--calendar-weekend-text))]")}>
              {day}
            </span>
          ))}
        </div>

        {/* Desktop MagicBento Grid */}
        <div className="flex-1 flex flex-col min-h-0 overflow-visible p-1.5 -m-1.5">
          <MagicBento
            gridClassName="grid-cols-7 grid-rows-6 gap-2 flex-1 min-h-0 p-1.5 overflow-visible"
            enableTilt={true}
            enableMagnetism={true}
            glowColor={profile?.theme === "dark" ? "132, 0, 255" : "150, 100, 255"}
            items={days.map((day) => {
              const date = format(day, "yyyy-MM-dd");
              const info = getCalendarDayInfo(date, cycles, profile?.averageCycleLength, profile?.averagePeriodLength);
              const log = dailyLogs.find((item) => item.date === date);
              const hasPrivate = Boolean(log?.intimacy?.occurred && !profile?.hidePrivateMarkers);
              const selected = selectedDate === date;
              const todayDate = isSameDay(day, today);
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              const isCurrentMonth = isSameMonth(day, month);

              return {
                id: date,
                className: cn(
                  "group relative isolate !min-h-0 !p-0 rounded-2xl border transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:border-[hsl(var(--calendar-hover-border))] hover:shadow-soft focus-within:ring-2 focus-within:ring-[hsl(var(--calendar-selected-ring))]",
                  "bg-[hsl(var(--calendar-day-bg))] text-[hsl(var(--calendar-day-text))]",
                  weekend && "bg-[hsl(var(--calendar-weekend-bg))] text-[hsl(var(--calendar-weekend-text))]",
                  isCurrentMonth ? "border-border/60" : "border-transparent text-[hsl(var(--calendar-outside-month-text))] opacity-35",
                  todayDate && "ring-2 ring-[hsl(var(--calendar-today-ring))] shadow-sm z-10",
                  selected && "scale-[1.02] !border-[hsl(var(--calendar-selected-ring))] ring-2 ring-[hsl(var(--calendar-selected-ring))] shadow-md z-20"
                ),
                content: (
                  <button
                    onClick={() => setSelectedDate(date)}
                    className="absolute inset-0 flex h-full w-full items-center justify-center outline-none select-none cursor-pointer"
                    aria-label={`${format(day, "d MMMM", { locale: localeRu })}, ${weekend ? "выходной день, " : ""}${todayDate ? "сегодня, " : ""}${selected ? "выбранный день, " : ""}${ru.phase[info.phase]}`}
                  >
                    {isCurrentMonth ? (
                      <>
                        <span aria-hidden className={cn("absolute inset-x-3 top-1.5 h-0.5 rounded-full", phaseAccent[info.phase])} />
                        {weekend ? <span aria-hidden className="absolute inset-x-3 top-3 h-px rounded-full bg-warning/45" /> : null}
                        {info.isFertile ? <span aria-hidden className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-[hsl(var(--phase-fertile)/0.35)]" /> : null}
                        {info.isPredictedPeriod && !info.isActualPeriod ? (
                          <span aria-hidden className="absolute inset-1.5 rounded-xl border border-dashed border-coral/70 bg-[hsl(var(--coral)/0.08)]" />
                        ) : null}
                        {info.isActualPeriod ? <span aria-hidden className="absolute inset-1.5 rounded-xl bg-coral/20 ring-1 ring-coral/35" /> : null}
                        {info.isOvulation ? <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[hsl(var(--phase-ovulation))] shadow-[0_0_0_3px_hsl(var(--phase-ovulation)/0.2)]" /> : null}
                      </>
                    ) : null}

                    <span className={cn("relative z-10 text-sm font-semibold", info.isActualPeriod && isCurrentMonth && "text-coral")}>
                      {format(day, "d")}
                    </span>

                    {isCurrentMonth && todayDate ? <span aria-hidden className="absolute left-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                    {isCurrentMonth && log ? <span className="absolute bottom-2 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" title="Есть запись" /> : null}
                    {isCurrentMonth && hasPrivate ? <Heart className="absolute right-2 top-5 z-10 h-3.5 w-3.5 text-coral" fill="currentColor" aria-label="Есть приватная запись" /> : null}
                  </button>
                )
              };
            })}
          />
        </div>

        {/* Desktop Footer Actions & Disclaimer */}
        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-muted/80 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-semibold rounded-xl border-coral/40 bg-coral/10 text-coral hover:bg-coral/20 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
              onClick={() => setPeriodStartModalOpen(true)}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Изменить дату начала месячных
            </Button>
            {relevantCycle && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-semibold rounded-xl border-primary/40 bg-primarySoft/60 text-primary hover:bg-primarySoft active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
                onClick={() => setPeriodEndModalOpen(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Месячные закончились
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-right">
            <p>{ru.fertileWarning}</p>
            <p className="hidden lg:block">Все фазы и прогнозы рассчитываются приблизительно.</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE CALENDAR (< md): Native Compact Grid, Fullscreen Viewport, Fast     */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-1 flex-col pb-2 pt-3">
        {/* Mobile Header */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold capitalize tracking-normal min-w-0 truncate">
            {format(month, "LLLL yyyy", { locale: localeRu })}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              aria-label="Предыдущий месяц"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setMonth(addMonths(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 px-3 text-xs rounded-xl" onClick={goToday}>
              Сегодня
            </Button>
            <Button
              aria-label="Следующий месяц"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Sub-header with Legend */}
        <div className="flex items-center justify-end mb-1">
          <div className="relative">
            <Button
              aria-expanded={legendOpen}
              variant="ghost"
              className="text-xs h-7 px-2 text-muted hover:text-text"
              onClick={() => setLegendOpen((open) => !open)}
            >
              Обозначения
            </Button>
            {legendOpen ? <Legend onClose={() => setLegendOpen(false)} /> : null}
          </div>
        </div>

        {/* Mobile Days of Week */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-semibold text-muted mb-1 px-1.5">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <span key={day} className={cn((day === "Сб" || day === "Вс") && "text-[hsl(var(--calendar-weekend-text))]")}>
              {day}
            </span>
          ))}
        </div>

        {/* Mobile 42-day Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-1.5 overflow-visible">
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const info = getCalendarDayInfo(date, cycles, profile?.averageCycleLength, profile?.averagePeriodLength);
            const log = dailyLogs.find((item) => item.date === date);
            const hasPrivate = Boolean(log?.intimacy?.occurred && !profile?.hidePrivateMarkers);
            const selected = selectedDate === date;
            const todayDate = isSameDay(day, today);
            const weekend = day.getDay() === 0 || day.getDay() === 6;
            const isCurrentMonth = isSameMonth(day, month);

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "group relative isolate aspect-square w-full rounded-2xl transition-all duration-150 active:scale-95 flex items-center justify-center select-none outline-none",
                  "bg-[hsl(var(--calendar-day-bg))] text-[hsl(var(--calendar-day-text))]",
                  weekend && "bg-[hsl(var(--calendar-weekend-bg))] text-[hsl(var(--calendar-weekend-text))]",
                  isCurrentMonth ? "" : "text-[hsl(var(--calendar-outside-month-text))] opacity-35",
                  todayDate && "ring-2 ring-[hsl(var(--calendar-today-ring))] shadow-sm z-10",
                  selected && "scale-[1.04] ring-2 ring-[hsl(var(--calendar-selected-ring))] shadow-md z-20"
                )}
                aria-label={`${format(day, "d MMMM", { locale: localeRu })}, ${weekend ? "выходной день, " : ""}${todayDate ? "сегодня, " : ""}${selected ? "выбранный день, " : ""}${ru.phase[info.phase]}`}
              >
                {isCurrentMonth ? (
                  <>
                    <span aria-hidden className={cn("absolute inset-x-2 top-1 h-0.5 rounded-full", phaseAccent[info.phase])} />
                    {weekend ? <span aria-hidden className="absolute inset-x-2 top-2.5 h-px rounded-full bg-warning/45" /> : null}
                    {info.isFertile ? <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full bg-[hsl(var(--phase-fertile)/0.35)]" /> : null}
                    {info.isPredictedPeriod && !info.isActualPeriod ? (
                      <span aria-hidden className="absolute inset-1 rounded-xl border border-dashed border-coral/70 bg-[hsl(var(--coral)/0.08)]" />
                    ) : null}
                    {info.isActualPeriod ? <span aria-hidden className="absolute inset-1 rounded-xl bg-coral/20 ring-1 ring-coral/35" /> : null}
                    {info.isOvulation ? <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--phase-ovulation))] shadow-[0_0_0_3px_hsl(var(--phase-ovulation)/0.2)]" /> : null}
                  </>
                ) : null}

                <span className={cn("relative z-10 text-sm font-semibold", info.isActualPeriod && isCurrentMonth && "text-coral")}>
                  {format(day, "d")}
                </span>

                {isCurrentMonth && todayDate ? <span aria-hidden className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                {isCurrentMonth && log ? <span className="absolute bottom-1 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" title="Есть запись" /> : null}
                {isCurrentMonth && hasPrivate ? <Heart className="absolute right-1 top-4 z-10 h-3.5 w-3.5 text-coral" fill="currentColor" aria-label="Есть приватная запись" /> : null}
              </button>
            );
          })}
        </div>

        {/* Mobile Day Summary Banner & Period Actions */}
        <div className="mt-auto pt-2 shrink-0 space-y-2">
          {/* Quick Period Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 px-2 text-xs font-bold rounded-2xl border-coral/40 bg-coral/10 text-coral hover:bg-coral/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              onClick={() => setPeriodStartModalOpen(true)}
            >
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span className="truncate">Изменить дату начала</span>
            </Button>
            <Button
              variant="outline"
              className="h-10 px-2 text-xs font-bold rounded-2xl border-primary/40 bg-primarySoft/60 text-primary hover:bg-primarySoft active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              onClick={() => setPeriodEndModalOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Месячные закончились</span>
            </Button>
          </div>

          {(() => {
            const activeDate = selectedDate || format(today, "yyyy-MM-dd");
            const activeInfo = getCalendarDayInfo(activeDate, cycles, profile?.averageCycleLength, profile?.averagePeriodLength);
            const activeLog = dailyLogs.find((l) => l.date === activeDate);
            return (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">
                    {format(parseISO(activeDate), "d MMMM yyyy", { locale: localeRu })}
                  </p>
                  <p className="text-sm font-bold truncate">
                    {activeInfo.cycleDay}-й день · {ru.phase[activeInfo.phase]}
                  </p>
                  {activeLog ? (
                    <p className="text-xs text-primary font-medium mt-0.5">
                      Есть запись {activeLog.mood ? `· ${ru.mood[activeLog.mood]}` : ""} {activeLog.flow && activeLog.flow !== "none" ? `· ${ru.flow[activeLog.flow]}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted/80 mt-0.5">Записи за этот день нет</p>
                  )}
                </div>
                <Button
                  className="h-8 px-3 text-xs rounded-xl shrink-0 font-semibold"
                  onClick={() => setSelectedDate(activeDate)}
                >
                  {activeLog ? "Редактировать" : "Добавить запись"}
                </Button>
              </div>
            );
          })()}
          <p className="mt-1 text-[10px] text-muted/70 text-center">Все фазы и прогнозы рассчитываются приблизительно.</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: DAY EDITING, CHANGE PERIOD START, AND END PERIOD EARLY           */}
      {/* ========================================================================= */}
      {selectedDate && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 md:items-center md:p-6"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedDate(undefined);
              }}
            >
              <div
                className="w-full md:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden rounded-t-[28px] md:rounded-3xl shadow-2xl bg-card border-t border-border/60 md:border md:border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border/80 md:hidden shrink-0" />
                <DayEditor key={selectedDate} date={selectedDate} compact onClose={() => setSelectedDate(undefined)} />
              </div>
            </div>,
            document.body
          )
        : null}

      {periodStartModalOpen ? (
        <PeriodStartModal
          currentCycle={relevantCycle}
          initialDate={selectedDate || relevantCycle?.startDate || format(today, "yyyy-MM-dd")}
          periodLength={profile?.averagePeriodLength ?? 5}
          onClose={() => setPeriodStartModalOpen(false)}
          onSave={async (newDate) => {
            await updatePeriodStartDate(newDate, relevantCycle?.id);
          }}
        />
      ) : null}

      {periodEndModalOpen && relevantCycle ? (
        <PeriodEndModal
          currentCycle={relevantCycle}
          initialEndDate={
            selectedDate && selectedDate >= relevantCycle.startDate
              ? selectedDate
              : format(today, "yyyy-MM-dd") >= relevantCycle.startDate
                ? format(today, "yyyy-MM-dd")
                : relevantCycle.endDate || relevantCycle.startDate
          }
          onClose={() => setPeriodEndModalOpen(false)}
          onSave={async (newEndDate) => {
            await endPeriod(newEndDate, relevantCycle.id);
          }}
        />
      ) : null}
    </div>
  );
}

function Legend({ onClose }: { onClose: () => void }) {
  const items = [
    ["Фактические месячные", "bg-coral/20 ring-1 ring-coral/45"],
    ["Прогноз месячных", "border border-dashed border-coral/70 bg-coral/10"],
    ["Фолликулярная фаза", "bg-[hsl(var(--phase-follicular)/0.55)]"],
    ["Фертильное окно", "bg-[hsl(var(--phase-fertile)/0.35)]"],
    ["Овуляция", "bg-[hsl(var(--phase-ovulation))] shadow-[0_0_0_3px_hsl(var(--phase-ovulation)/0.22)]"],
    ["Лютеиновая фаза", "bg-[hsl(var(--phase-luteal)/0.55)]"],
    ["Есть запись", "bg-primary"],
    ["Сегодня", "ring-2 ring-[hsl(var(--calendar-today-ring))]"],
    ["Выбранный день", "ring-2 ring-[hsl(var(--calendar-selected-ring))]"],
    ["Выходной день", "bg-[hsl(var(--calendar-weekend-bg))] border border-warning/30"]
  ] as const;
  return (
    <div className="mobile-sheet fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-soft md:absolute md:inset-auto md:right-0 md:top-12 md:max-h-[min(70vh,34rem)] md:w-[28rem] md:rounded-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold">Обозначения</h3>
        <button className="rounded-full p-2 hover:bg-primarySoft" aria-label="Закрыть обозначения" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
        {items.map(([label, klass]) => (
          <span key={label} className="flex items-center gap-2">
            <span className={cn("h-4 w-4 rounded-md", klass)} />
            {label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Фазы, прогноз месячных, овуляция и фертильное окно рассчитываются приблизительно на основании календарных данных.
      </p>
    </div>
  );
}

function PeriodStartModal({
  currentCycle,
  initialDate,
  periodLength,
  onClose,
  onSave
}: {
  currentCycle?: CycleEntry;
  initialDate: string;
  periodLength: number;
  onClose: () => void;
  onSave: (date: string) => Promise<void>;
}) {
  const [chosenDate, setChosenDate] = useState(initialDate);
  const [saving, setSaving] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const previewStartDate = parseISO(chosenDate);
  const validDate = !Number.isNaN(previewStartDate.getTime());
  const previewEndDate = validDate ? addDays(previewStartDate, periodLength - 1) : previewStartDate;

  async function handleConfirm() {
    if (!validDate) return;
    setSaving(true);
    try {
      await onSave(chosenDate);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[28px] md:rounded-3xl shadow-2xl bg-card border-t border-border/60 md:border md:border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border/80 md:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-coral/15 flex items-center justify-center text-coral">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Дата начала месячных</h2>
              <p className="text-xs text-muted">Перестройка цикла и подсветки</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm overflow-y-auto max-h-[70dvh]">
          {/* Current Info */}
          {currentCycle && (
            <div className="rounded-2xl border border-border/60 bg-primarySoft/30 p-3.5 space-y-1">
              <p className="text-xs text-muted font-medium">Текущее начало цикла:</p>
              <p className="font-semibold text-text">
                {format(parseISO(currentCycle.startDate), "d MMMM yyyy", { locale: localeRu })}
              </p>
            </div>
          )}

          {/* Date Picker Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Новая дата первого дня месячных
            </label>
            <input
              type="date"
              value={chosenDate}
              onChange={(e) => e.target.value && setChosenDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-border/70 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {/* Quick shortcuts */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs rounded-xl"
                onClick={() => setChosenDate(todayStr)}
              >
                Сегодня ({format(new Date(), "d MMM", { locale: localeRu })})
              </Button>
              {initialDate !== todayStr && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs rounded-xl"
                  onClick={() => setChosenDate(initialDate)}
                >
                  Выбранный день ({format(parseISO(initialDate), "d MMM", { locale: localeRu })})
                </Button>
              )}
            </div>
          </div>

          {/* Calculation Preview */}
          {validDate && (
            <div className="rounded-2xl border border-coral/30 bg-coral/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-coral font-semibold text-xs">
                <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
                Что произойдет в календаре:
              </div>
              <p className="text-xs text-text/90 leading-relaxed">
                Красным будут подсвечены <strong>{periodLength} {pluralDays(periodLength)}</strong> (из настроек при регистрации):
              </p>
              <p className="text-sm font-bold text-coral">
                {format(previewStartDate, "d MMMM", { locale: localeRu })} — {format(previewEndDate, "d MMMM yyyy", { locale: localeRu })}
              </p>
              <p className="text-[11px] text-muted">
                Все фазы, овуляция и прогнозы следующих циклов автоматически пересчитаются от новой даты.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-border/40 bg-card flex items-center gap-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          <Button
            className="flex-1 min-h-11 text-sm font-bold rounded-2xl shadow-lg shadow-coral/20 bg-gradient-to-r from-coral to-coral/90 text-white hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            disabled={!validDate || saving}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Сохранение..." : "Применить и перестроить цикл"}
          </Button>
          <Button variant="ghost" className="min-h-11 px-4 text-xs rounded-2xl cursor-pointer" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PeriodEndModal({
  currentCycle,
  initialEndDate,
  onClose,
  onSave
}: {
  currentCycle: CycleEntry;
  initialEndDate: string;
  onClose: () => void;
  onSave: (date: string) => Promise<void>;
}) {
  const [chosenEndDate, setChosenEndDate] = useState(initialEndDate);
  const [saving, setSaving] = useState(false);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const startParsed = parseISO(currentCycle.startDate);
  const endParsed = parseISO(chosenEndDate);
  const valid = !Number.isNaN(endParsed.getTime()) && chosenEndDate >= currentCycle.startDate;
  const actualLength = valid ? differenceInCalendarDays(endParsed, startParsed) + 1 : 1;

  async function handleConfirm() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(chosenEndDate);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 md:items-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[28px] md:rounded-3xl shadow-2xl bg-card border-t border-border/60 md:border md:border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border/80 md:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/15 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Месячные закончились</h2>
              <p className="text-xs text-muted">Завершение текущих месячных</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm overflow-y-auto max-h-[70dvh]">
          <div className="rounded-2xl border border-border/60 bg-primarySoft/30 p-3.5 space-y-1">
            <p className="text-xs text-muted font-medium">Начало этих месячных:</p>
            <p className="font-semibold text-text">
              {format(startParsed, "d MMMM yyyy", { locale: localeRu })}
            </p>
            {currentCycle.endDate && (
              <p className="text-xs text-muted pt-1">
                Было запланировано до: {format(parseISO(currentCycle.endDate), "d MMMM yyyy", { locale: localeRu })}
              </p>
            )}
          </div>

          {/* End Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Дата последнего дня месячных
            </label>
            <input
              type="date"
              min={currentCycle.startDate}
              value={chosenEndDate}
              onChange={(e) => e.target.value && setChosenEndDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-border/70 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {/* Quick shortcuts */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs rounded-xl"
                onClick={() => setChosenEndDate(todayStr >= currentCycle.startDate ? todayStr : currentCycle.startDate)}
              >
                Сегодня ({format(new Date(), "d MMM", { locale: localeRu })})
              </Button>
              {initialEndDate !== todayStr && initialEndDate >= currentCycle.startDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs rounded-xl"
                  onClick={() => setChosenEndDate(initialEndDate)}
                >
                  Выбранный день ({format(parseISO(initialEndDate), "d MMM", { locale: localeRu })})
                </Button>
              )}
            </div>
          </div>

          {/* Explanation preview */}
          {valid ? (
            <div className="rounded-2xl border border-primary/30 bg-primarySoft/40 p-3.5 space-y-2">
              <p className="text-xs text-text/90 leading-relaxed">
                Фактическая длительность составит: <strong>{actualLength} {pluralDays(actualLength)}</strong>.
              </p>
              <p className="text-xs text-muted">
                Красная подсветка после <strong>{format(endParsed, "d MMMM", { locale: localeRu })}</strong> будет сразу снята.
              </p>
            </div>
          ) : (
            <p className="text-xs text-coral font-medium">
              Дата окончания не может быть раньше даты начала ({format(startParsed, "d MMMM yyyy", { locale: localeRu })}).
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-border/40 bg-card flex items-center gap-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          <Button
            className="flex-1 min-h-11 text-sm font-bold rounded-2xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 text-white hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            disabled={!valid || saving}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Сохранение..." : "Завершить месячные"}
          </Button>
          <Button variant="ghost" className="min-h-11 px-4 text-xs rounded-2xl cursor-pointer" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
