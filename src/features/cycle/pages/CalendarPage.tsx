import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Info, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { ru } from "../../../i18n/ru";
import { cn } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import { getCalendarDayInfo } from "../domain/cycleCalculations";
import { DayEditor } from "../../daily-log/components/DayEditor";
import { MagicBento } from "../../../components/ui/MagicBento";

const phaseAccent = {
  menstrual: "bg-[hsl(var(--phase-menstrual)/0.7)]",
  follicular: "bg-[hsl(var(--phase-follicular)/0.48)]",
  fertile: "bg-[hsl(var(--phase-fertile)/0.58)]",
  ovulation: "bg-[hsl(var(--phase-ovulation)/0.7)]",
  luteal: "bg-[hsl(var(--phase-luteal)/0.48)]"
};

export function CalendarPage() {
  const { cycles, profile, dailyLogs } = useAppStore();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [legendOpen, setLegendOpen] = useState(false);
  const today = new Date();
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
      <div className="flex-1 flex flex-col pb-2 pt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-bold capitalize tracking-normal">{format(month, "LLLL yyyy", { locale: localeRu })}</h2>
            <div className="flex items-center gap-1">
              <Button aria-label="Предыдущий месяц" size="icon" variant="outline" className="h-8 w-8" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 px-3 text-xs" onClick={goToday}>Сегодня</Button>
              <Button aria-label="Следующий месяц" size="icon" variant="outline" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Button aria-expanded={legendOpen} variant="ghost" onClick={() => setLegendOpen((open) => !open)}>
              Обозначения
            </Button>
            {legendOpen ? <Legend onClose={() => setLegendOpen(false)} /> : null}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <span key={day} className={cn((day === "Сб" || day === "Вс") && "text-[hsl(var(--calendar-weekend-text))]")}>{day}</span>
          ))}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <MagicBento
            gridClassName="mt-2 grid-cols-7 grid-rows-6 gap-1 sm:gap-2 flex-1 min-h-0"
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
                "group relative isolate !min-h-0 !p-0 overflow-hidden rounded-xl border transition-all duration-200 active:scale-[0.95] hover:-translate-y-0.5 hover:border-[hsl(var(--calendar-hover-border))] hover:shadow-soft focus-within:ring-2 focus-within:ring-[hsl(var(--calendar-selected-ring))]",
                "bg-[hsl(var(--calendar-day-bg))] text-[hsl(var(--calendar-day-text))]",
                weekend && "bg-[hsl(var(--calendar-weekend-bg))] text-[hsl(var(--calendar-weekend-text))]",
                isCurrentMonth ? "border-border" : "border-transparent text-[hsl(var(--calendar-outside-month-text))] opacity-50",
                todayDate && "ring-2 ring-[hsl(var(--calendar-today-ring))] ring-offset-2 ring-offset-[hsl(var(--background))]",
                selected && "scale-[1.03] border-[hsl(var(--calendar-selected-ring))] ring-2 ring-[hsl(var(--calendar-selected-ring))] ring-offset-2 ring-offset-[hsl(var(--background))]"
              ),
              content: (
                <button
                  onClick={() => setSelectedDate(date)}
                  className="absolute inset-0 flex h-full w-full items-center justify-center outline-none"
                  aria-label={`${format(day, "d MMMM", { locale: localeRu })}, ${weekend ? "выходной день, " : ""}${todayDate ? "сегодня, " : ""}${selected ? "выбранный день, " : ""}${ru.phase[info.phase]}`}
                >
                  {isCurrentMonth ? (
                    <>
                      <span aria-hidden className={cn("absolute inset-x-2 top-1 h-0.5 rounded-full", phaseAccent[info.phase])} />
                      {weekend ? <span aria-hidden className="absolute inset-x-2 top-2.5 h-px rounded-full bg-warning/45" /> : null}
                      {info.isFertile ? <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full bg-[hsl(var(--phase-fertile)/0.35)]" /> : null}
                      {info.isPredictedPeriod && !info.isActualPeriod ? (
                        <span aria-hidden className="absolute inset-1.5 rounded-xl border border-dashed border-coral/70 bg-[hsl(var(--coral)/0.08)]" />
                      ) : null}
                      {info.isActualPeriod ? <span aria-hidden className="absolute inset-1 rounded-xl bg-coral/20 ring-1 ring-coral/35" /> : null}
                      {info.isOvulation ? <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--phase-ovulation))] shadow-[0_0_0_3px_hsl(var(--phase-ovulation)/0.2)]" /> : null}
                    </>
                  ) : null}
                  
                  <span className={cn("relative z-10 text-sm font-semibold", info.isActualPeriod && isCurrentMonth && "text-coral")}>{format(day, "d")}</span>
                  
                  {isCurrentMonth && todayDate ? <span aria-hidden className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  {isCurrentMonth && log ? <span className="absolute bottom-1 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" title="Есть запись" /> : null}
                  {isCurrentMonth && hasPrivate ? <Sparkles className="absolute right-1 top-4 z-10 h-3.5 w-3.5 text-primary" aria-label="Есть приватная запись" /> : null}
                </button>
              )
            };
          })}
        />
        </div>
        <div className="mt-4 flex flex-col gap-1 shrink-0 px-2 sm:px-0">
          <p className="text-xs text-muted">{ru.fertileWarning}</p>
          <p className="text-xs text-muted">Все фазы и прогнозы рассчитываются приблизительно.</p>
        </div>
      </div>

      {selectedDate ? (
        <div className="fixed inset-0 z-50 flex items-end bg-text/25 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="w-full md:max-w-2xl">
            <button className="absolute right-4 top-4 hidden h-11 w-11 items-center justify-center rounded-full bg-card md:flex" aria-label="Закрыть" onClick={() => setSelectedDate(undefined)}>
              <X className="h-5 w-5" />
            </button>
            <DayEditor key={selectedDate} date={selectedDate} compact onClose={() => setSelectedDate(undefined)} />
          </div>
        </div>
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
