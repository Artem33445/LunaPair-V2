import { addDays, addMonths, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { ArrowLeft, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Eye, Heart, HeartHandshake, LockKeyhole, LogOut, ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { ru } from "../../../i18n/ru";
import { cn } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import type { CyclePhase, EnergyLevel, PartnerDashboardData, PartnerVisibleDay } from "../../../types";
import { buildPartnerDashboardData } from "../domain/partnerDashboard";
import { MagicBento, type BentoItem } from "../../../components/ui/MagicBento";
import { CycleRing } from "../../cycle/components/CycleRing";

const phaseClasses: Record<CyclePhase, string> = {
  menstrual: "bg-[hsl(var(--phase-menstrual)/0.55)]",
  follicular: "bg-[hsl(var(--phase-follicular)/0.55)]",
  fertile: "bg-[hsl(var(--phase-fertile)/0.55)]",
  ovulation: "bg-[hsl(var(--phase-ovulation)/0.55)]",
  luteal: "bg-[hsl(var(--phase-luteal)/0.55)]"
};

const phaseAccent: Record<CyclePhase, string> = {
  menstrual: "bg-[hsl(var(--phase-menstrual)/0.7)]",
  follicular: "bg-[hsl(var(--phase-follicular)/0.48)]",
  fertile: "bg-[hsl(var(--phase-fertile)/0.58)]",
  ovulation: "bg-[hsl(var(--phase-ovulation)/0.7)]",
  luteal: "bg-[hsl(var(--phase-luteal)/0.48)]"
};

const energyText: Record<EnergyLevel, string> = {
  "very-low": "очень низкая",
  low: "низкая",
  normal: "обычная",
  high: "высокая",
  "very-high": "очень высокая"
};

export function PartnerPage() {
  const { profile, cycles, dailyLogs, enablePartnerDemo, setRole } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const view = location.pathname.endsWith("/calendar")
    ? "calendar"
    : location.pathname.endsWith("/support")
      ? "support"
      : location.pathname.endsWith("/history")
        ? "history"
        : "today";
  const range = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(addDays(start, 41), "yyyy-MM-dd")
    };
  }, [month]);
  const dashboard = useMemo(
    () => buildPartnerDashboardData({ profile, cycles, dailyLogs, startDate: range.startDate, endDate: range.endDate }),
    [cycles, dailyLogs, profile, range.endDate, range.startDate]
  );
  const selectedDay = selectedDate ? dashboard.calendarDays.find((day) => day.date === selectedDate) : undefined;
  const confirmed = Boolean(profile?.partnerInviteConfirmed);

  if (profile?.role === "partner" && cycles.length === 0) {
    return (
      <Card className="space-y-4">
        <HeartHandshake className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Локальный предпросмотр режима партнёра</h1>
        <p className="text-muted">
          Синхронизация между устройствами пока не подключена. Можно открыть демо-профиль, чтобы посмотреть read-only интерфейс.
        </p>
        <Button onClick={() => void enablePartnerDemo(profile.name)}>Открыть демо-режим</Button>
      </Card>
    );
  }

  if (!confirmed) {
    return (
      <Card className="space-y-4">
        <LockKeyhole className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Нужно подтверждение партнёрши</h1>
        <p className="text-muted">
          Чтобы открыть партнёрский read-only режим, в профиле девушки нужно сгенерировать ключ и подтвердить его. Это локальный preview, без настоящей синхронизации между устройствами.
        </p>
        {profile?.partnerInviteCode ? (
          <p className="rounded-2xl bg-primarySoft p-4 text-sm text-muted">
            Текущий ключ создан: <span className="font-bold tracking-[0.2em] text-primary">{profile.partnerInviteCode}</span>. Подтверди его в профиле девушки.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/profile")}>Открыть профиль</Button>
          {profile?.role === "partner" ? (
            <Button variant="outline" onClick={() => void setRole("tracker").then(() => navigate("/profile"))}>
              <LogOut className="h-4 w-4" />
              Вернуться в режим девушки
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  if (dashboard.connectionStatus === "paused") {
    return <BlockedState title="Доступ временно приостановлен" text="Причина не показывается. Данные партнёрши сейчас скрыты." />;
  }

  if (dashboard.connectionStatus === "disconnected") {
    return <BlockedState title="Партнёрский доступ отключён" text="В локальном preview новые данные больше не показываются." />;
  }

  if (view === "calendar") {
    return (
      <>
        <PartnerCalendar
          dashboard={dashboard}
          month={month}
          setMonth={setMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onBack={() => navigate("/partner")}
        />
        {selectedDay ? <DayDetails day={selectedDay} onClose={() => setSelectedDate(undefined)} /> : null}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerHeader
        dashboard={dashboard}
        onPermissions={() => navigate("/profile")}
        onExit={profile?.role === "partner" ? () => void setRole("tracker").then(() => navigate("/profile")) : undefined}
      />

      {view === "today" ? (
        <motion.div 
          className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="space-y-5">
            <CycleSummary dashboard={dashboard} />
            <PartnerEmpathyCard phase={dashboard.currentPhase} />
          </div>
          <TodayWellbeing today={dashboard.today} />
        </motion.div>
      ) : null}

      {view === "support" ? <SupportView dashboard={dashboard} /> : null}

      {view === "history" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <HistoryCard dashboard={dashboard} />
          <StatisticsCard dashboard={dashboard} />
        </div>
      ) : null}

      {view === "support" || view === "today" ? <SafetyCard /> : null}

      {selectedDay ? <DayDetails day={selectedDay} onClose={() => setSelectedDate(undefined)} /> : null}
    </div>
  );
}

function PartnerHeader({ dashboard, onPermissions, onExit }: { dashboard: PartnerDashboardData; onPermissions: () => void; onExit?: () => void }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm text-muted">{format(new Date(), "d MMMM, EEEE", { locale: localeRu })}</p>
        <h1 className="text-3xl font-bold">Сегодня · {dashboard.partnerDisplayName ?? "Партнёрша"}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primarySoft px-3 py-1 text-xs font-semibold text-primary">
            <Eye className="h-4 w-4" />
            Только просмотр
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-primarySoft px-3 py-1 text-xs font-semibold text-muted">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Локальный preview
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onPermissions}>
          <LockKeyhole className="h-4 w-4" />
          Разрешения
        </Button>
        {onExit ? (
          <Button variant="outline" onClick={onExit}>
            <LogOut className="h-4 w-4" />
            Выйти из preview
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function CycleSummary({ dashboard }: { dashboard: PartnerDashboardData }) {
  const navigate = useNavigate();
  const nextPhaseText = dashboard.prediction?.futureProjections?.[0]
    ? `Следующий ожидаемый этап начнется примерно ${formatShort(dashboard.prediction.futureProjections[0].predictedStartDate)}`
    : undefined;

  return (
    <MagicBento
      gridClassName="grid-cols-1"
      items={[{
        id: "summary",
        className: "bg-primarySoft/30",
        content: (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Текущий цикл</h2>
                <p className="text-sm text-muted">Показываются только открытые категории.</p>
              </div>
              <button 
                onClick={() => navigate("/partner/calendar")}
                className="rounded-full p-2 hover:bg-primarySoft/50 transition-colors"
                title="Открыть календарь"
              >
                <CalendarDays className="h-7 w-7 text-primary" />
              </button>
            </div>

            {dashboard.prediction ? (
              <div className="py-4">
                <CycleRing prediction={dashboard.prediction} />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {!dashboard.prediction && (
                <>
                  <Metric label="День цикла" value={dashboard.currentCycleDay ? `${dashboard.currentCycleDay}-й день` : undefined} />
                  <Metric label="Фаза" value={dashboard.currentPhase ? ru.phase[dashboard.currentPhase] : undefined} />
                </>
              )}
              <Metric
                label="До предполагаемых месячных"
                value={dashboard.daysUntilPredictedPeriod !== undefined ? `около ${dashboard.daysUntilPredictedPeriod} дн.` : undefined}
              />
              <Metric
                label="Диапазон прогноза"
                value={dashboard.predictedRange ? `${formatShort(dashboard.predictedRange.start)} — ${formatShort(dashboard.predictedRange.end)}` : undefined}
              />
            </div>

            {nextPhaseText && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card/60 p-3 shadow-sm border border-border">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-semibold">{nextPhaseText}</p>
              </div>
            )}

            <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted mt-4">
              Уверенность прогноза: {dashboard.confidence ? confidenceLabel(dashboard.confidence) : "информация закрыта"}. Данные и прогнозы LunaPair помогают замечать закономерности, но не являются медицинским диагнозом.
            </p>
          </div>
        )
      }]}
    />
  );
}

function TodayWellbeing({ today }: { today?: PartnerVisibleDay }) {
  return (
    <MagicBento
      gridClassName="grid-cols-1 h-full"
      items={[{
        id: "today-wellbeing",
        className: "h-full",
        content: (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Как она себя чувствует сегодня</h2>
            <div className="grid gap-3">
              <Metric label="Самочувствие" value={today?.wellbeing ? ru.wellbeing[today.wellbeing] : undefined} />
              <Metric label="Настроение" value={today?.mood ? ru.mood[today.mood] : undefined} />
              <Metric label="Энергия" value={today?.energy ? energyText[today.energy] : undefined} />
              <Metric label="Сон" value={today?.sleepQuality ? `${ru.sleepQuality[today.sleepQuality]}${today.sleepHours ? ` · ${today.sleepHours} ч` : ""}` : undefined} />
              <Metric label="Боль" value={today?.painLevel !== undefined ? `${today.painLevel}/10` : undefined} />
              <Metric label="Симптомы" value={today?.symptoms?.length ? today.symptoms.join(", ") : undefined} />
              <Metric label="Комментарий" value={today?.notePreview} />
              <Metric label="Приватный маркер" value={today?.hasPrivateMarker ? "Есть приватная отметка" : undefined} />
              <Metric label="Интимная близость" value={formatIntimacy(today?.intimacy)} />
            </div>
          </div>
        )
      }]}
    />
  );
}

function SupportView({ dashboard }: { dashboard: PartnerDashboardData }) {
  const bentoItems: BentoItem[] = [];

  if (dashboard.supportCard) {
    bentoItems.push({
      id: "support-card",
      className: "lg:col-span-1 bg-primarySoft/30",
      content: (
        <>
          <p className="text-sm font-semibold text-primary">Рекомендация поддержки · источник: {sourceLabel(dashboard.supportCard.source)}</p>
          <h2 className="mt-2 text-xl font-bold">{dashboard.supportCard.title}</h2>
          <p className="mt-2 text-sm text-muted">{dashboard.supportCard.body}</p>
          <div className="mt-4 grid gap-2">
            {dashboard.supportCard.actions.map((action) => (
              <span key={action} className="rounded-2xl border border-border bg-card/70 p-3 text-sm font-semibold">
                {action}
              </span>
            ))}
          </div>
        </>
      )
    });
  } else {
    bentoItems.push({
      id: "support-card",
      className: "lg:col-span-1",
      title: "Поддержка",
      content: <LockedText />
    });
  }

  bentoItems.push({
    id: "support-rules",
    className: "lg:col-span-1",
    title: "Как пользоваться бережно",
    content: (
      <div className="space-y-3 mt-4">
        <p className="text-sm text-muted">Не делай выводы за партнёршу и не связывай автоматически настроение с циклом.</p>
        <p className="text-sm text-muted">Лучший формат помощи: коротко спросить, предложить конкретное действие и спокойно принять любой ответ.</p>
        <p className="text-sm text-muted">Даже полный доступ остаётся только просмотром: редактирование, удаление и изменение расчётов заблокированы.</p>
      </div>
    )
  });

  return (
    <MagicBento gridClassName="grid-cols-1 lg:grid-cols-2" items={bentoItems} />
  );
}

function PartnerCalendar({
  dashboard,
  month,
  setMonth,
  selectedDate,
  setSelectedDate,
  onBack
}: {
  dashboard: PartnerDashboardData;
  month: Date;
  setMonth: (date: Date) => void;
  selectedDate?: string;
  setSelectedDate: (date: string) => void;
  onBack: () => void;
}) {
  const theme = useAppStore((state) => state.profile?.theme);
  const today = new Date();

  if (!dashboard.calendarDays.length) {
    return (
      <MagicBento
        gridClassName="grid-cols-1"
        items={[{
          id: "calendar",
          title: "Календарь",
          content: <LockedText />
        }]}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col pb-2 pt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" onClick={onBack} aria-label="Назад">
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h2 className="text-2xl font-bold capitalize tracking-normal">{format(month, "LLLL yyyy", { locale: localeRu })}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button aria-label="Предыдущий месяц" size="icon" variant="outline" className="h-8 w-8" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setMonth(startOfMonth(new Date()))}>Сегодня</Button>
              <Button aria-label="Следующий месяц" size="icon" variant="outline" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm font-medium text-muted">
            Режим партнёра
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
            glowColor={theme === "dark" ? "132, 0, 255" : "150, 100, 255"}
            items={dashboard.calendarDays.map((day) => {
              const dayDate = parseISO(day.date);
              const selected = selectedDate === day.date;
              const todayDate = isSameDay(dayDate, today);
              const weekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const isCurrentMonth = isSameMonth(dayDate, month);
              const hasLog = day.wellbeing || day.mood || day.notePreview || day.symptoms?.length;

              return {
                id: day.date,
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
                    onClick={() => setSelectedDate(day.date)}
                    className="absolute inset-0 flex h-full w-full items-center justify-center outline-none"
                    aria-label={`${format(dayDate, "d MMMM", { locale: localeRu })}. Открыть день только для просмотра`}
                  >
                    {isCurrentMonth ? (
                      <>
                        {day.phase ? <span aria-hidden className={cn("absolute inset-x-2 top-1 h-0.5 rounded-full", phaseAccent[day.phase])} /> : null}
                        {weekend ? <span aria-hidden className="absolute inset-x-2 top-2.5 h-px rounded-full bg-warning/45" /> : null}
                        {day.isFertileWindow ? <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full bg-[hsl(var(--phase-fertile)/0.35)]" /> : null}
                        {day.isPredictedPeriodDay && !day.isConfirmedPeriodDay ? (
                          <span aria-hidden className="absolute inset-1.5 rounded-xl border border-dashed border-coral/70 bg-[hsl(var(--coral)/0.08)]" />
                        ) : null}
                        {day.isConfirmedPeriodDay ? <span aria-hidden className="absolute inset-1 rounded-xl bg-coral/20 ring-1 ring-coral/35" /> : null}
                        {day.isPredictedOvulation ? <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--phase-ovulation))] shadow-[0_0_0_3px_hsl(var(--phase-ovulation)/0.2)]" /> : null}
                      </>
                    ) : null}
                    
                    <span className={cn("relative z-10 text-sm font-semibold", day.isConfirmedPeriodDay && isCurrentMonth && "text-coral")}>{format(dayDate, "d")}</span>
                    
                    {isCurrentMonth && todayDate ? <span aria-hidden className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                    {isCurrentMonth && hasLog ? <span className="absolute bottom-1 left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" title="Есть запись" /> : null}
                    {isCurrentMonth && day.hasPrivateMarker ? <Heart className="absolute right-1 top-4 z-10 h-3.5 w-3.5 text-coral" fill="currentColor" aria-label="Есть приватная запись" /> : null}
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
    </div>
  );
}

function DayDetails({ day, onClose }: { day: PartnerVisibleDay; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-text/25 backdrop-blur-sm md:items-center md:justify-center md:p-6">
      <Card className="mobile-sheet w-full overflow-y-auto rounded-t-card md:max-w-2xl md:rounded-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{format(parseISO(day.date), "d MMMM yyyy", { locale: localeRu })}</p>
            <h2 className="text-xl font-bold">День только для просмотра</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Закрыть" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="День цикла" value={day.cycleDay ? `${day.cycleDay}-й день` : undefined} />
          <Metric label="Фаза" value={day.phase ? ru.phase[day.phase] : undefined} />
          <Metric label="Месячные" value={day.isConfirmedPeriodDay ? "Подтверждённый день" : day.isPredictedPeriodDay ? "Прогнозный день" : undefined} />
          <Metric label="Фертильное окно" value={day.isFertileWindow ? "Приблизительный календарный прогноз" : undefined} />
          <Metric label="Самочувствие" value={day.wellbeing ? ru.wellbeing[day.wellbeing] : undefined} />
          <Metric label="Настроение" value={day.mood ? ru.mood[day.mood] : undefined} />
          <Metric label="Сон" value={day.sleepQuality ? `${ru.sleepQuality[day.sleepQuality]}${day.sleepHours ? ` · ${day.sleepHours} ч` : ""}` : undefined} />
          <Metric label="Боль" value={day.painLevel !== undefined ? `${day.painLevel}/10` : undefined} />
          <Metric label="Симптомы" value={day.symptoms?.length ? day.symptoms.join(", ") : undefined} />
          <Metric label="Комментарий" value={day.notePreview} />
          <Metric label="Приватный маркер" value={day.hasPrivateMarker ? "Есть приватная отметка" : undefined} />
          <Metric label="Интимная близость" value={formatIntimacy(day.intimacy)} />
        </div>
        <p className="mt-4 rounded-2xl bg-primarySoft p-3 text-sm text-muted">
          Редактирование, удаление и изменение месячных в партнёрском режиме недоступны.
        </p>
      </Card>
    </div>
  );
}

function HistoryCard({ dashboard }: { dashboard: PartnerDashboardData }) {
  return (
    <MagicBento
      gridClassName="grid-cols-1 h-full"
      enableTilt={false}
      enableMagnetism={false}
      items={[{
        id: "history",
        className: "h-full",
        content: (
          <>
            <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="h-5 w-5 text-primary" />История циклов</h2>
            {dashboard.cycleHistory?.length ? (
              <div className="mt-4 space-y-3">
                {dashboard.cycleHistory.slice(-5).map((cycle) => (
                  <div key={cycle.startDate} className="rounded-2xl border border-border p-3 text-sm bg-card/50">
                    <p className="font-semibold">{formatShort(cycle.startDate)}{cycle.endDate ? ` — ${formatShort(cycle.endDate)}` : ""}</p>
                    <p className="text-muted">Длина: {cycle.cycleLength ? `${cycle.cycleLength} дн.` : "нет данных"} · месячные: {cycle.periodLength ? `${cycle.periodLength} дн.` : "нет данных"}</p>
                  </div>
                ))}
              </div>
            ) : <LockedText />}
          </>
        )
      }]}
    />
  );
}

function StatisticsCard({ dashboard }: { dashboard: PartnerDashboardData }) {
  return (
    <MagicBento
      gridClassName="grid-cols-1 h-full"
      enableTilt={false}
      enableMagnetism={false}
      items={[{
        id: "statistics",
        className: "h-full",
        content: (
          <>
            <h2 className="flex items-center gap-2 text-xl font-bold"><BarChart3 className="h-5 w-5 text-primary" />Общая статистика</h2>
            {dashboard.statistics ? (
              <div className="mt-4 grid gap-3">
                <Metric label="Записей в расчёте" value={`${dashboard.statistics.logCount}`} />
                <Metric label="Средняя боль" value={dashboard.statistics.averagePain !== undefined ? `${dashboard.statistics.averagePain}/10` : undefined} />
                <Metric label="Частое настроение" value={dashboard.statistics.frequentMood ? ru.mood[dashboard.statistics.frequentMood] : undefined} />
                <Metric label="Частые симптомы" value={dashboard.statistics.frequentSymptoms.length ? dashboard.statistics.frequentSymptoms.join(", ") : undefined} />
              </div>
            ) : <LockedText />}
          </>
        )
      }]}
    />
  );
}

function SafetyCard() {
  return (
    <MagicBento
      gridClassName="grid-cols-1"
      items={[{
        id: "safety",
        content: (
          <div className="space-y-2">
            <h2 className="font-bold">Безопасность и границы</h2>
            <p className="text-sm text-muted">Локальный предпросмотр режима партнёра. Синхронизация между устройствами пока не подключена.</p>
            <p className="text-sm text-muted">{ru.medicalWarning}</p>
            <p className="text-sm text-muted">{ru.fertileWarning}</p>
          </div>
        )
      }]}
    />
  );
}

function BlockedState({ title, text }: { title: string; text: string }) {
  return (
    <Card className="space-y-4">
      <LockKeyhole className="h-10 w-10 text-primary" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">{text}</p>
      <p className="text-sm text-muted">Режим партнёра не показывает скрытые данные и не объясняет причину ограничения.</p>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value ?? <LockedText inline />}</p>
    </div>
  );
}

function LockedText({ inline = false }: { inline?: boolean }) {
  const text = "Эта информация не открыта для просмотра";
  if (inline) return <span className="text-muted">{text}</span>;
  return <p className="mt-3 rounded-2xl bg-primarySoft p-3 text-sm text-muted">{text}.</p>;
}

function formatShort(date: string) {
  return format(parseISO(date), "d MMM", { locale: localeRu });
}

function confidenceLabel(value: "low" | "medium" | "high") {
  if (value === "high") return "выше";
  if (value === "medium") return "средняя";
  return "низкая";
}

function sourceLabel(source: string) {
  if (source === "preferences") return "предпочтения";
  if (source === "today-log") return "запись за сегодня";
  if (source === "pattern") return "повторяющееся наблюдение";
  if (source === "phase") return "фаза цикла";
  return "общая подсказка";
}

function formatIntimacy(intimacy: PartnerVisibleDay["intimacy"]) {
  if (!intimacy) return undefined;
  if (intimacy.occurred === null) return "Не отмечено";
  if (!intimacy.occurred) return "Нет";
  const details = [
    "Да",
    intimacy.type ? `тип: ${ru.intimacy.type[intimacy.type]}` : undefined,
    intimacy.protection ? `защита: ${ru.intimacy.protection[intimacy.protection]}` : undefined,
    intimacy.afterFeeling ? `после: ${ru.intimacy.afterFeeling[intimacy.afterFeeling]}` : undefined,
    intimacy.note ? `заметка: ${intimacy.note}` : undefined
  ].filter(Boolean);
  return details.join(" · ");
}

function PartnerEmpathyCard({ phase }: { phase?: CyclePhase }) {
  if (!phase || !ru.partnerTips?.[phase]) return null;
  return (
    <MagicBento
      gridClassName="grid-cols-1"
      items={[{
        id: "empathy",
        className: cn("border-none text-white", phaseClasses[phase] || "bg-primary"),
        content: (
          <div className="relative overflow-hidden z-10">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <HeartHandshake className="h-5 w-5" />
              Подсказка для тебя
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed opacity-90">{ru.partnerTips[phase]}</p>
          </div>
        )
      }]}
    />
  );
}
