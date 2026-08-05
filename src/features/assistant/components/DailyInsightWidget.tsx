import { useEffect, useState } from "react";
import { Sparkles, Bot } from "lucide-react";
import { useAppStore } from "../../../stores/appStore";
import { generateDailyInsight } from "../../../services/aiService";
import type { AppProfile, DailyLog } from "../../../types";

interface Props {
  profile: AppProfile;
  cycleDay: number;
  phase: string;
  recentLogs: DailyLog[];
}

export function DailyInsightWidget({ profile, cycleDay, phase, recentLogs }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!profile.geminiApiKey) {
      setInsight("Чтобы получать персонализированные умные советы от ИИ, добавьте API-ключ Gemini в настройках.");
      return;
    }

    const cacheKey = `insight_${new Date().toISOString().split("T")[0]}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setInsight(cached);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    generateDailyInsight(profile.geminiApiKey, profile, cycleDay, phase, recentLogs)
      .then((res) => {
        if (isMounted) {
          setInsight(res);
          if (!res.startsWith("Не удалось загрузить")) {
            sessionStorage.setItem(cacheKey, res);
          }
        }
      })
      .catch(() => {
        if (isMounted) setInsight("Не удалось загрузить совет дня.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profile.geminiApiKey, profile, cycleDay, phase, recentLogs]);

  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primarySoft via-card to-card p-[1px]">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl"></div>
      <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-card/60 p-5 backdrop-blur-xl">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-primary">
          <Sparkles className="h-5 w-5" /> Совет от Luna AI
        </h3>
        
        {isLoading ? (
          <div className="flex animate-pulse space-x-2 items-center text-muted">
            <Bot className="w-5 h-5" />
            <span className="text-sm">Генерация персонального инсайта...</span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-text">{insight}</p>
        )}
      </div>
    </div>
  );
}
