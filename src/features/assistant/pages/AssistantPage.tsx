import { Send, Trash2, Bot, AlertTriangle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/field";
import { useAppStore } from "../../../stores/appStore";
import { sendChatMessageStream, type ChatMessage } from "../../../services/aiService";
import { predictCycle } from "../../cycle/domain/cycleCalculations";

const quickQuestions = [
  "Как рассчитывается следующая дата?",
  "Что мне записать сегодня?",
  "Почему может быть задержка?",
  "Что делать при сильной боли?",
  "Почему прогноз изменился?",
  "Как партнёр может поддержать?"
];

const storageKey = "lunapair-assistant-history";
const draftKey = "lunapair-assistant-draft";

export function AssistantPage() {
  const { cycles, profile, dailyLogs } = useAppStore();
  const [question, setQuestion] = useState(() => localStorage.getItem(draftKey) ?? "");
  const [isThinking, setIsThinking] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => m && typeof m.role === 'string');
        }
      } catch {
        // Fallback
      }
    }
    return [{ role: "model", content: "Привет! Я Luna, твой персональный помощник по женскому здоровью. Ты можешь спрашивать меня о своем цикле, самочувствии или просить совета." }];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(draftKey, question);
  }, [question]);

  async function answer(text: string) {
    setIsThinking(true);
    setQuestion("");
    
    setMessages((current) => [...current, { role: "user", content: text }]);
    setStreamingResponse("");

    try {
      const prediction = predictCycle(cycles, undefined, profile?.averageCycleLength ?? 28, profile?.averagePeriodLength ?? 5);

      const responseText = await sendChatMessageStream(
        profile!, 
        messages, 
        text,
        (chunk) => {
          setStreamingResponse(chunk);
        },
        prediction.cycleDay,
        prediction.currentPhase,
        dailyLogs.slice(-7)
      );
      setMessages((current) => [...current, { role: "model", content: responseText }]);
    } catch {
      setMessages((current) => [...current, { role: "model", content: "Произошла ошибка связи с AI. Проверьте интернет-соединение." }]);
    }
    setStreamingResponse("");
    setIsThinking(false);
  }

  function clearHistory() {
    localStorage.removeItem(storageKey);
    setMessages([{ role: "model", content: "История диалога очищена." }]);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="w-8 h-8 text-primary" />Умный ассистент Luna</h1>
          <p className="text-muted">Подключён AI-ассистент</p>
        </div>
        <Button variant="outline" onClick={clearHistory}>
          <Trash2 className="h-4 w-4" />
          Очистить историю
        </Button>
      </header>

      <Card className="glass-panel flex flex-col h-[calc(100dvh-12.5rem)] min-h-[400px]">
        <div className="mb-4 rounded-2xl bg-primarySoft p-3 text-xs sm:text-sm text-muted flex gap-2">
           <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
           Luna не заменяет врача. Приватные заметки, интимные данные и ваше имя не передаются в AI.
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          {quickQuestions.map((item) => (
            <Button key={item} variant="outline" size="default" onClick={() => void answer(item)}>{item}</Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 rounded-card border border-border bg-card/60 p-3 mb-4">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm ${message.role === "model" ? "bg-primarySoft text-text mr-8" : "ml-auto bg-primary text-white md:max-w-[78%] ml-8"}`}>
              {(message.content || "").split("\n").map((line, i) => (
                <p key={i} className="mb-1 last:mb-0">{line}</p>
              ))}
            </div>
          ))}
          {isThinking && streamingResponse ? (
            <div className="rounded-2xl p-4 text-sm bg-primarySoft text-text mr-8">
              {streamingResponse.split("\n").map((line, i) => (
                <p key={i} className="mb-1 last:mb-0">{line}</p>
              ))}
            </div>
          ) : isThinking ? (
            <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted w-fit animate-pulse">Luna печатает...</p>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <form className="mt-auto flex gap-2" onSubmit={(event) => { event.preventDefault(); if (question.trim()) void answer(question.trim()); }}>
          <Input value={question} disabled={isThinking} onChange={(event) => setQuestion(event.target.value)} placeholder="Спросить Luna..." className="rounded-full" />
          <Button size="icon" aria-label="Отправить" disabled={isThinking || !question.trim()} className="rounded-full shrink-0 w-12 h-12 p-0 flex items-center justify-center"><Send className="h-5 w-5 ml-1" /></Button>
        </form>
      </Card>
    </div>
  );
}
