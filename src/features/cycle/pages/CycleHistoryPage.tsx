import { format, parseISO } from "date-fns";
import { ru as localeRu } from "date-fns/locale";
import { Card } from "../../../components/ui/card";
import { ru } from "../../../i18n/ru";
import { useAppStore } from "../../../stores/appStore";
import { buildReports } from "../domain/cycleReports";

export function CycleHistoryPage() {
  const cycles = useAppStore((state) => state.cycles);
  const logs = useAppStore((state) => state.dailyLogs);
  const reports = buildReports(cycles, logs);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Прошлые циклы</h1>
        <p className="text-muted">Подробные отчёты строятся только из локальных записей.</p>
      </header>

      {reports.length === 0 ? (
        <Card>
          <h2 className="text-xl font-bold">Завершённых циклов пока нет</h2>
          <p className="mt-2 text-muted">После начала следующего цикла здесь появится первый подробный отчёт.</p>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.cycleId} className="glass-panel space-y-4">
            <div>
              <p className="text-sm text-muted">
                {format(parseISO(report.startDate), "d MMMM yyyy", { locale: localeRu })}
                {report.endDate ? ` — ${format(parseISO(report.endDate), "d MMMM", { locale: localeRu })}` : ""}
              </p>
              <h2 className="text-xl font-bold">Отчёт цикла</h2>
            </div>
            {report.insufficientData ? (
              <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted">Для подробного отчёта пока недостаточно записей.</p>
            ) : null}
            <dl className="grid gap-3 sm:grid-cols-2">
              <Metric label="Длина цикла" value={report.cycleLength ? `${report.cycleLength} дней` : "Пока неизвестно"} />
              <Metric label="Заполненность" value={`${report.completionRate}%`} />
              <Metric label="Средняя боль" value={report.averagePain === null ? "Нет данных" : `${report.averagePain}/10`} />
              <Metric label="Записей" value={`${report.logCount}`} />
              <Metric label="Частое настроение" value={report.frequentMood ? ru.mood[report.frequentMood] : "Нет данных"} />
              <Metric label="Отклонение прогноза" value={report.predictedDeviationDays === undefined ? "Нет данных" : `${report.predictedDeviationDays} дн.`} />
            </dl>
            <div>
              <p className="text-sm font-semibold">Частые симптомы</p>
              <p className="mt-1 text-sm text-muted">{report.frequentSymptoms.length ? report.frequentSymptoms.join(", ") : "Нет данных"}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
