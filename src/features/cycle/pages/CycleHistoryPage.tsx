import { format, parseISO } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { ru } from "../../../i18n/ru";
import { useAppStore } from "../../../stores/appStore";
import { buildReports } from "../domain/cycleReports";
import { MagicBento, type BentoItem } from "../../../components/ui/MagicBento";

export function CycleHistoryPage() {
  const cycles = useAppStore((state) => state.cycles);
  const logs = useAppStore((state) => state.dailyLogs);
  const reports = buildReports(cycles, logs);

  const theme = useAppStore((state) => state.profile?.theme);

  return (
    <div className="space-y-8 relative z-10">
      <header>
        <h1 className="text-3xl font-bold">Прошлые циклы</h1>
        <p className="text-muted mt-1">Подробные отчёты строятся только из локальных записей.</p>
      </header>

      {reports.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold">Завершённых циклов пока нет</h2>
          <p className="mt-2 text-muted">После начала следующего цикла здесь появится первый подробный отчёт.</p>
        </div>
      ) : null}

      <div className="space-y-12">
        {reports.map((report) => {
          const bentoItems: BentoItem[] = [
            {
              id: "length",
              label: "Длина цикла",
              title: report.cycleLength ? `${report.cycleLength} дней` : "Неизвестно",
            },
            {
              id: "completion",
              label: "Заполненность",
              title: `${report.completionRate}%`,
            },
            {
              id: "pain",
              label: "Средняя боль",
              title: report.averagePain === null ? "Нет данных" : `${report.averagePain}/10`,
            },
            {
              id: "logs",
              label: "Записей",
              title: `${report.logCount}`,
            },
            {
              id: "mood",
              label: "Частое настроение",
              title: report.frequentMood ? ru.mood[report.frequentMood] : "Нет данных",
              className: "md:col-span-2 lg:col-span-2"
            },
            {
              id: "symptoms",
              label: "Частые симптомы",
              title: report.frequentSymptoms.length ? report.frequentSymptoms.join(", ") : "Нет данных",
              className: "md:col-span-2 lg:col-span-2"
            }
          ];

          return (
            <section key={report.cycleId} className="space-y-5">
              <div className="flex flex-col border-b border-border/50 pb-3">
                <h2 className="text-2xl font-bold">Отчёт цикла</h2>
                <p className="text-sm text-primary font-medium mt-1">
                  {format(parseISO(report.startDate), "d MMMM yyyy", { locale: localeRu })}
                  {report.endDate ? ` — ${format(parseISO(report.endDate), "d MMMM", { locale: localeRu })}` : ""}
                </p>
              </div>
              
              {report.insufficientData ? (
                <p className="rounded-2xl bg-primarySoft p-4 text-sm text-muted">
                  Для подробного отчёта пока недостаточно записей.
                </p>
              ) : null}
              
              <MagicBento 
                items={bentoItems} 
                gridClassName="grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
                glowColor={theme === "dark" ? "132, 0, 255" : "150, 100, 255"}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
