import { useState } from "react";
import { Card } from "../../../components/ui/card";
import { FieldLabel, Input } from "../../../components/ui/field";
import { todayIso } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import { DayEditor } from "../components/DayEditor";

export function LogPage() {
  const [date, setDate] = useState(todayIso());
  const dailyLogs = useAppStore((state) => state.dailyLogs);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-5">
        <header>
          <h1 className="text-3xl font-bold">Ежедневная запись</h1>
          <p className="text-muted">Настроение, симптомы, сон, энергия и приватные заметки хранятся локально.</p>
        </header>
        <Card>
          <div className="mb-5">
            <FieldLabel htmlFor="log-date">Дата</FieldLabel>
            <Input id="log-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <DayEditor key={date} date={date} />
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-bold">Последние записи</h2>
        <div className="mt-4 space-y-3">
          {dailyLogs.length === 0 ? <p className="text-sm text-muted">Записей пока нет.</p> : null}
          {[...dailyLogs].reverse().slice(0, 10).map((log) => (
            <button key={log.id} className="w-full rounded-2xl border border-border p-3 text-left hover:bg-primarySoft" onClick={() => setDate(log.date)}>
              <div className="font-semibold">{log.date}</div>
              <div className="text-sm text-muted">
                симптомов {log.symptoms.length} · боль {log.painLevel ?? log.pain ?? 0}/10
                {log.intimacy?.occurred ? " · есть приватная запись" : ""}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
