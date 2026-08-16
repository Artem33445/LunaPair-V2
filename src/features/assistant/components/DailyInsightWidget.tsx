import { useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getPersonalAdvice } from "../../../services/adviceService";
import { useAppStore } from "../../../stores/appStore";
import type { AppProfile, CycleEntry, DailyLog, PersonalAdvicePackage, PredictionResult } from "../../../types";

interface Props {
  profile: AppProfile;
  cycles: CycleEntry[];
  recentLogs: DailyLog[];
  prediction: PredictionResult;
}

export function DailyInsightWidget({ profile, cycles, recentLogs, prediction }: Props) {
  const authUser = useAppStore((state) => state.authUser);
  const [advice, setAdvice] = useState<PersonalAdvicePackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const loadAdvice = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPersonalAdvice({
        profile,
        cycles,
        dailyLogs: recentLogs,
        prediction,
        uid: authUser?.uid
      });
      setAdvice(result.advice);
      setIsStale(result.stale);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.uid, cycles, prediction, profile, recentLogs]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getPersonalAdvice({
      profile,
      cycles,
      dailyLogs: recentLogs,
      prediction,
      uid: authUser?.uid
    })
      .then((result) => {
        if (!isMounted) return;
        setAdvice(result.advice);
        setIsStale(result.stale);
      })
      .catch(() => {
        if (!isMounted) return;
        setAdvice(null);
        setIsStale(false);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authUser?.uid, cycles, prediction, profile, recentLogs]);

  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primarySoft via-card to-card p-[1px]">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl"></div>
      <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-card/60 p-5 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-primary">
            <Bot className="h-5 w-5" /> Совет от Luna AI
          </h3>
          <Button
            aria-label="Обновить советы"
            className="min-h-9 rounded-xl px-3 text-xs"
            disabled={isLoading}
            onClick={() => void loadAdvice()}
            variant="ghost"
          >
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Обновить
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-2/3 rounded-full bg-primarySoft"></div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="h-20 rounded-2xl bg-primarySoft/70"></div>
              <div className="h-20 rounded-2xl bg-primarySoft/50"></div>
              <div className="h-20 rounded-2xl bg-primarySoft/60"></div>
            </div>
          </div>
        ) : advice ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-text">{advice.summary}</p>
            <div className="grid gap-2 md:grid-cols-3">
              {advice.tips.map((tip) => (
                <article key={`${tip.category}-${tip.title}`} className="rounded-2xl border border-border/60 bg-background/45 p-3">
                  <p className="text-sm font-semibold text-text">{tip.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{tip.text}</p>
                </article>
              ))}
            </div>
            <p className="text-xs text-muted opacity-80">
              {isStale
                ? "Показаны последние сохраненные советы. Новые появятся, когда AI снова будет доступен."
                : "Советы обновляются не чаще раза в сутки или при заметном изменении данных цикла."}
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-text">
            Не удалось подготовить советы. Экран не потерял данные, попробуй обновить чуть позже.
          </p>
        )}
      </div>
    </div>
  );
}
