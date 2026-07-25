import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../../components/ui/card";
import { averagePeriodLength, predictCycle } from "../../cycle/domain/cycleCalculations";
import { buildCycleIntervals } from "../../cycle/domain/cyclePredictionService";
import { useAppStore } from "../../../stores/appStore";
import { MagicBento, type BentoItem } from "../../../components/ui/MagicBento";

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

  const bentoItems: BentoItem[] = [
    {
      id: "avg-cycle",
      label: "Средняя длина цикла",
      content: <p className="mt-2 text-2xl font-bold">{factualAverageCycleLength ? `${factualAverageCycleLength} дн.` : "Мало данных"}</p>,
      className: "md:col-span-1"
    },
    {
      id: "avg-period",
      label: "Месячные",
      content: <p className="mt-2 text-2xl font-bold">{factualAveragePeriodLength} дн.</p>,
      className: "md:col-span-1"
    },
    {
      id: "avg-pain",
      label: "Средняя боль",
      content: <p className="mt-2 text-2xl font-bold">{avgPain}/10</p>,
      className: "md:col-span-1"
    },
    {
      id: "avg-energy",
      label: "Средняя энергия",
      content: <p className="mt-2 text-2xl font-bold">{avgEnergy}/10</p>,
      className: "md:col-span-1"
    },
    {
      id: "chart-energy",
      title: "Энергия и боль",
      className: "md:col-span-2 lg:col-span-2 min-h-[300px]",
      content: chartData.length ? (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="energy" name="Энергия" stroke="hsl(var(--primary))" strokeWidth={3} />
              <Line type="monotone" dataKey="pain" name="Боль" stroke="hsl(var(--coral))" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty />
    },
    {
      id: "chart-symptoms",
      title: "Количество симптомов",
      className: "md:col-span-2 lg:col-span-2 min-h-[300px]",
      content: chartData.length ? (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="symptoms" name="Симптомы" fill="hsl(var(--warning))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty />
    }
  ];

  if (completedCycleLengths.length < 2) {
    bentoItems.splice(4, 0, {
      id: "low-data",
      className: "md:col-span-4 bg-primarySoft shadow-none border-primary/20 min-h-0",
      content: <p className="text-sm text-muted">Статистика будет точнее после нескольких подтверждённых циклов.</p>
    });
  }

  bentoItems.push({
    id: "confidence",
    title: `Качество данных: ${prediction.dataConfidence === "high" ? "выше" : prediction.dataConfidence === "medium" ? "среднее" : "низкое"}`,
    description: "Это показатель количества и стабильности введённых данных, а не медицинской точности.",
    className: "md:col-span-4 bg-primarySoft shadow-none border-primary/20 min-h-0"
  });

  return (
    <div className="flex flex-1 flex-col space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Статистика</h1>
        <p className="text-muted">Графики строятся только из локально сохранённых данных.</p>
      </header>
      
      <MagicBento 
        items={bentoItems} 
        gridClassName="grid-cols-1 md:grid-cols-4 lg:grid-cols-4 flex-1" 
        enableTilt={false} 
        glowColor={profile?.theme === "dark" ? "132, 0, 255" : "150, 100, 255"} 
      />
    </div>
  );
}



function Empty() {
  return <p className="rounded-2xl bg-primarySoft p-4 text-sm text-muted">Недостаточно записей для графика.</p>;
}
