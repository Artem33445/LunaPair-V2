import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../../components/ui/card";
import { averagePeriodLength, predictCycle } from "../../cycle/domain/cycleCalculations";
import { buildCycleIntervals } from "../../cycle/domain/cyclePredictionService";
import { useAppStore } from "../../../stores/appStore";

export function StatsPage() {
  const { dailyLogs, cycles, profile } = useAppStore();
  const prediction = predictCycle(cycles, new Date(), profile?.averageCycleLength, profile?.averagePeriodLength);
  const completedCycleLengths = buildCycleIntervals(cycles)
    .map((interval) => interval.length)
    .filter((length) => length >= 15 && length <= 90);
  const factualAverageCycleLength = completedCycleLengths.length
    ? Math.round(completedCycleLengths.reduce((sum, length) => sum + length, 0) / completedCycleLengths.length)
    : undefined;
  const factualAveragePeriodLength = averagePeriodLength(cycles, profile?.averagePeriodLength ?? 5);
  const chartData = dailyLogs.slice(-14).map((log) => ({
    date: log.date.slice(5),
    energy: log.energy ?? 0,
    pain: log.pain ?? 0,
    symptoms: log.symptoms.length
  }));
  const avgPain = dailyLogs.length ? (dailyLogs.reduce((sum, log) => sum + (log.pain ?? 0), 0) / dailyLogs.length).toFixed(1) : "0";
  const avgEnergy = dailyLogs.length ? (dailyLogs.reduce((sum, log) => sum + (log.energy ?? 0), 0) / dailyLogs.length).toFixed(1) : "0";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Статистика</h1>
        <p className="text-muted">Графики строятся только из локально сохранённых данных.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Средняя длина цикла" value={factualAverageCycleLength ? `${factualAverageCycleLength} дн.` : "Мало данных"} />
        <Metric label="Месячные" value={`${factualAveragePeriodLength} дн.`} />
        <Metric label="Средняя боль" value={`${avgPain}/10`} />
        <Metric label="Средняя энергия" value={`${avgEnergy}/10`} />
      </div>
      {completedCycleLengths.length < 2 ? (
        <Card className="bg-primarySoft shadow-none">
          <p className="text-sm text-muted">Статистика будет точнее после нескольких подтверждённых циклов.</p>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-h-80">
          <h2 className="mb-4 text-xl font-bold">Энергия и боль</h2>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="energy" name="Энергия" stroke="hsl(var(--primary))" strokeWidth={3} />
                <Line type="monotone" dataKey="pain" name="Боль" stroke="hsl(var(--coral))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
        <Card className="min-h-80">
          <h2 className="mb-4 text-xl font-bold">Количество симптомов</h2>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="symptoms" name="Симптомы" fill="hsl(var(--warning))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>
      <Card className="bg-primarySoft shadow-none">
        <h2 className="font-bold">Качество данных: {prediction.dataConfidence === "high" ? "выше" : prediction.dataConfidence === "medium" ? "среднее" : "низкое"}</h2>
        <p className="mt-2 text-sm text-muted">Это показатель количества и стабильности введённых данных, а не медицинской точности.</p>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function Empty() {
  return <p className="rounded-2xl bg-primarySoft p-4 text-sm text-muted">Недостаточно записей для графика.</p>;
}
