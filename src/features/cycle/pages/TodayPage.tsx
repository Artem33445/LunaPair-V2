import { format, parseISO } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { MessageCircle, Moon, ShieldCheck, Sun } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { ru } from "../../../i18n/ru";
import { todayIso } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import { CycleRing } from "../components/CycleRing";
import { dailyAdvice, daysUntil, phaseHint, pluralDays, predictCycle } from "../domain/cycleCalculations";
import { personalInsight } from "../domain/cycleReports";
import { MagicBento, type BentoItem } from "../../../components/ui/MagicBento";
import { DailyInsightWidget } from "../../assistant/components/DailyInsightWidget";

const phaseLegendItems = [
  { key: "menstrual", label: "Месячные" },
  { key: "follicular", label: "Фолликул." },
  { key: "fertile", label: "Фертильное окно" },
  { key: "ovulation", label: "Овуляция" },
  { key: "luteal", label: "Лютеиновая" }
] as const;

export function TodayPage() {
  const { authUser, profile, cycles, dailyLogs, startPeriod, endPeriod, setTheme } = useAppStore();
  const navigate = useNavigate();
  const prediction = useMemo(
    () => predictCycle(cycles, new Date(), profile?.averageCycleLength, profile?.averagePeriodLength),
    [cycles, profile?.averageCycleLength, profile?.averagePeriodLength]
  );
  const daysToPeriod = daysUntil(prediction.predictedNextPeriodStart);
  const daysDelayed = prediction.pendingExpectation?.daysDelayed ?? 0;
  const periodStatusText =
    daysDelayed > 0
      ? `Ожидаемое начало сдвинуто на ${pluralDays(daysDelayed)}, пока начало месячных не подтверждено`
      : `До предполагаемых месячных ${pluralDays(daysToPeriod)}`;
  const todayLog = dailyLogs.find((log) => log.date === todayIso());
  const latest = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1);
  const periodActive = latest && !latest.endDate;
  const name = profile?.name.trim();

  const bentoItems: BentoItem[] = [
    {
      id: "state",
      label: "Состояние дня",
      className: "lg:row-span-2",
      content: todayLog ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Настроение" value={todayLog.mood ? ru.mood[todayLog.mood] : "Не выбрано"} />
          <Info label="Самочувствие" value={todayLog.wellbeing ? ru.wellbeing[todayLog.wellbeing] : "Нет данных"} />
          <Info label="Энергия" value={todayLog.energyLevel ? ru.energy[todayLog.energyLevel] : todayLog.energy !== undefined ? `${todayLog.energy}/10` : "Нет данных"} />
          <Info label="Боль" value={`${todayLog.painLevel ?? todayLog.pain ?? 0}/10`} />
          <Info label="Выделения" value={todayLog.flow ? ru.flow[todayLog.flow] : "Нет данных"} />
          <Info label="Симптомы" value={`${todayLog.symptoms.length}`} />
        </dl>
      ) : (
        <p className="mt-4 rounded-2xl bg-primarySoft p-4 text-sm text-muted">Сегодня записей пока нет. Добавь самочувствие за несколько секунд.</p>
      )
    },
    {
      id: "dates",
      label: "Ближайшие даты",
      content: (
        <>
          <dl className="mt-4 space-y-3 text-sm">
            <Info label="Следующие месячные" value={format(parseISO(prediction.predictedNextPeriodStart), "d MMMM", { locale: localeRu })} />
            <Info label="Ожидаемый диапазон" value={`${format(parseISO(prediction.uncertaintyStart), "d MMM", { locale: localeRu })} — ${format(parseISO(prediction.uncertaintyEnd), "d MMM", { locale: localeRu })}`} />
            <Info label="Фертильное окно" value={`${format(parseISO(prediction.fertileWindowStart), "d MMM", { locale: localeRu })} — ${format(parseISO(prediction.fertileWindowEnd), "d MMM", { locale: localeRu })}`} />
            <Info label="Овуляция" value={format(parseISO(prediction.predictedOvulationDate), "d MMMM", { locale: localeRu })} />
          </dl>
          <div className="mt-4 rounded-2xl bg-primarySoft/30 p-3">
            <p className="text-xs font-semibold text-muted">Прогноз вперёд</p>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              {prediction.futureProjections.slice(1, 4).map((projection) => (
                <span key={projection.index} className="rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-center">
                  {format(parseISO(projection.predictedStartDate), "d MMM", { locale: localeRu })}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted opacity-70">{ru.medicalWarning}</p>
        </>
      )
    },
    {
      id: "feeling",
      label: "Возможное самочувствие",
      content: (
        <>
          <p className="mt-2 text-sm text-muted">{phaseHint(prediction.currentPhase)}</p>
          <p className="mt-2 text-xs text-muted">{personalInsight(dailyLogs, prediction.cycleDay)}</p>
        </>
      )
    },
    {
      id: "advice",
      label: "Совет дня",
      className: "lg:col-span-2",
      content: (
        <p className="mt-2 text-sm text-muted">{dailyAdvice(prediction.currentPhase)}</p>
      )
    }
  ];

  return (
    <div className="space-y-4 pb-4">
      <header className="flex items-center justify-between gap-3 relative z-10 pt-1">
        <div>
          <p className="text-xs text-muted font-medium">{format(new Date(), "d MMMM, EEEE", { locale: localeRu })}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{name ? `Привет, ${name}` : "Привет!"}</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primarySoft px-2.5 py-0.5 text-xs font-medium text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {authUser ? "Облачная синхронизация" : ru.localOnly}
          </p>
        </div>
        <Button aria-label="Переключить тему" size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => void setTheme(profile?.theme === "dark" ? "light" : "dark")}>
          {profile?.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      <div className="mx-auto max-w-sm px-2 sm:px-0">
        <CycleRing prediction={prediction} />
        <div className="text-center my-2.5">
          <p className="text-sm text-muted font-medium">{periodStatusText}</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-xs text-muted sm:grid-cols-5">
          {phaseLegendItems.map((item) => (
            <span
              key={item.key}
              className="flex min-h-8 items-center justify-center rounded-xl bg-primarySoft/70 px-1 py-1 text-center text-[10px] font-medium leading-tight"
              aria-label={ru.phase[item.key]}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <section className="space-y-2 max-w-sm mx-auto w-full">
        <Button className="w-full soft-pulse min-h-12 text-sm font-semibold rounded-2xl" variant={periodActive ? "secondary" : "primary"} onClick={() => void (periodActive ? endPeriod() : startPeriod())}>
          {periodActive ? "Закончились месячные" : "Начались месячные"}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button className="min-h-11 text-xs font-medium rounded-2xl" variant="outline" onClick={() => navigate("/log")}>Симптомы</Button>
          <Button className="min-h-11 text-xs font-medium rounded-2xl" variant="outline" onClick={() => navigate("/log")}>Заметка дня</Button>
          <Button className="min-h-11 text-xs font-medium rounded-2xl" variant="outline" onClick={() => navigate("/calendar")}>Календарь</Button>
        </div>
        <Button className="w-full min-h-11 text-sm font-medium rounded-2xl" variant="outline" onClick={() => navigate("/assistant")}>
          <MessageCircle className="h-4 w-4 mr-2" />Спросить Luna
        </Button>
      </section>

      <div className="pt-2">
        <MagicBento items={bentoItems} glowColor={profile?.theme === "dark" ? "132, 0, 255" : "150, 100, 255"} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
