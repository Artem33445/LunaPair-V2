import { addDays, format, parseISO } from "date-fns";
import { useState } from "react";
import { todayIso } from "../../../lib/utils";
import { DayEditor } from "../components/DayEditor";

export function LogPage() {
  const [date, setDate] = useState(todayIso());

  function shiftDate(offset: number) {
    const next = addDays(parseISO(date), offset);
    setDate(format(next, "yyyy-MM-dd"));
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100dvh-var(--safe-top)-var(--mobile-nav-height)-0.75rem)] overflow-hidden">
      <DayEditor
        key={date}
        date={date}
        onDateChange={setDate}
        onPrevDay={() => shiftDate(-1)}
        onNextDay={() => shiftDate(1)}
      />
    </div>
  );
}
