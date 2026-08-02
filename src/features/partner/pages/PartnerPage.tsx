import { addDays, addMonths, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Eye, HeartHandshake, LockKeyhole, LogOut, ShieldCheck, X } from "lucide-react";
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

const phaseClasses: Record<CyclePhase, string> = {
  menstrual: "bg-[hsl(var(--phase-menstrual)/0.55)]",
  follicular: "bg-[hsl(var(--phase-follicular)/0.45)]",
  fertile: "bg-[hsl(var(--phase-fertile)/0.45)]",
  ovulation: "bg-[hsl(var(--phase-ovulation)/0.55)]",
  luteal: "bg-[hsl(var(--phase-luteal)/0.45)]"
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

  return (
    <div className="space-y-5">
      <PartnerHeader
        dashboard={dashboard}
        onPermissions={() => navigate("/profile")}
        onExit={profile?.role === "partner" ? () => void setRole("tracker").then(() => navigate("/profile")) : undefined}
      />

      {view === "today" ? (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <CycleSummary dashboard={dashboard} />
            <PartnerEmpathyCard phase={dashboard.currentPhase} />
          </div>
          <TodayWellbeing today={dashboard.today} />
        </div>
      ) : null}

      {view === "support" ? <SupportView dashboard={dashboard} /> : null}

      {view === "calendar" ? (
        <PartnerCalendar
          dashboard={dashboard}
          month={month}
          setMonth={setMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      ) : null}

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
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="День цикла" value={dashboard.currentCycleDay ? `${dashboard.currentCycleDay}-й день` : undefined} />
              <Metric label="Фаза" value={dashboard.currentPhase ? ru.phase[dashboard.currentPhase] : undefined} />
              <Metric
                label="До предполагаемых месячных"
                value={dashboard.daysUntilPredictedPeriod !== undefined ? `около ${dashboard.daysUntilPredictedPeriod} дн.` : undefined}
              />
              <Metric
                label="Диапазон прогноза"
                value={dashboard.predictedRange ? `${formatShort(dashboard.predictedRange.start)} — ${formatShort(dashboard.predictedRange.end)}` : undefined}
              />
            </div>
            <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted">
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
  setSelectedDate
}: {
  dashboard: PartnerDashboardData;
  month: Date;
  setMonth: (date: Date) => void;
  selectedDate?: string;
  setSelectedDate: (date: string) => void;
}) {
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
    <MagicBento
      gridClassName="grid-cols-1"
      enableTilt={false}
      enableMagnetism={false}
      items={[{
        id: "calendar",
        className: "!overflow-visible",
        content: (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Календарь партнёра</h2>
                <p className="text-sm text-muted">Дни открываются только для просмотра.</p>
              </div>
              <div className="flex gap-2">
                <Button aria-label="Предыдущий месяц" size="icon" variant="outline" onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>Сегодня</Button>
                <Button aria-label="Следующий месяц" size="icon" variant="outline" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <h3 className="mb-3 text-lg font-bold capitalize">{format(month, "LLLL yyyy", { locale: localeRu })}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted sm:gap-2">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
              {dashboard.calendarDays.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  className={cn(
                    "relative aspect-square rounded-xl border p-1 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary",
                    day.phase ? phaseClasses[day.phase] : "bg-card",
                    !isSameMonth(parseISO(day.date), month) && "opacity-45",
                    selectedDate === day.date ? "border-primary ring-2 ring-primary" : "border-border"
                  )}
                  onClick={() => setSelectedDate(day.date)}
                  aria-label={`${format(parseISO(day.date), "d MMMM", { locale: localeRu })}. Открыть день только для просмотра`}
                >
                  {format(parseISO(day.date), "d")}
                  {day.isConfirmedPeriodDay ? <span className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-coral" aria-hidden /> : null}
                  {day.isPredictedPeriodDay ? <span className="absolute inset-1 rounded-lg border border-dashed border-coral" aria-hidden /> : null}
                  {day.isFertileWindow ? <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-success" aria-hidden /> : null}
                  {day.isPredictedOvulation ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning" aria-hidden /> : null}
                  {day.hasPrivateMarker ? <span className="absolute left-1 top-1 h-2 w-2 rounded-full bg-primary" aria-label="Есть приватная отметка" /> : null}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">{ru.fertileWarning}</p>
          </>
        )
      }]}
    />
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
        className: "bg-primarySoft",
        content: (
          <>
            <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
              <HeartHandshake className="h-5 w-5" />
              Подсказка для тебя
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed">{ru.partnerTips[phase]}</p>
          </>
        )
      }]}
    />
  );
}
