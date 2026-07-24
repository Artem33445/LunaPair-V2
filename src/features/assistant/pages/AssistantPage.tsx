import { Copy, RotateCcw, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/field";
import { useAppStore } from "../../../stores/appStore";
import { buildAssistantResponse } from "../domain/assistantEngine";

interface Message {
  from: "user" | "assistant";
  text: string;
  sources?: string[];
}

const quickQuestions = [
  "Как рассчитывается следующая дата?",
  "Что мне записать сегодня?",
  "Почему может быть задержка?",
  "Что делать при сильной боли?",
  "Почему прогноз изменился?",
  "Что означает текущая фаза?",
  "Насколько точен прогноз овуляции?",
  "Можно ли доверять фертильному окну?",
  "Как читать статистику?",
  "Как партнёр может поддержать?",
  "Какие данные видит партнёр?"
];

const storageKey = "lunapair-assistant-history";
const draftKey = "lunapair-assistant-draft";

export function AssistantPage() {
  const { cycles, profile, dailyLogs } = useAppStore();
  const [question, setQuestion] = useState(() => localStorage.getItem(draftKey) ?? "");
  const [useContext, setUseContext] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved) as Message[];
      } catch {
        return [];
      }
    }
    return [{ from: "assistant", text: "Я Luna, локальный ассистент LunaPair. Спроси про цикл, прогноз, симптомы, самочувствие, партнёрский режим или приватность." }];
  });

  const safeContext = useMemo(
    () => ({
      cycles,
      logs: useContext ? dailyLogs.map(({ note: _note, intimacy: _intimacy, ...log }) => log) : [],
      averageCycleLength: profile?.averageCycleLength ?? 28,
      averagePeriodLength: profile?.averagePeriodLength ?? 5,
      usePersonalContext: useContext,
      recentMessages: messages.slice(-6).map((message) => `${message.from}: ${message.text.slice(0, 180)}`)
    }),
    [cycles, dailyLogs, messages, profile?.averageCycleLength, profile?.averagePeriodLength, useContext]
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(draftKey, question);
  }, [question]);

  function answer(text: string) {
    setLastQuestion(text);
    setIsThinking(true);
    window.setTimeout(() => {
      const response = buildAssistantResponse(text, safeContext);
      setMessages((current) => [
        ...current,
        { from: "user", text },
        { from: "assistant", text: response.answer, sources: response.sources }
      ]);
      setQuestion("");
      setIsThinking(false);
    }, 220);
  }

  function clearHistory() {
    localStorage.removeItem(storageKey);
    setMessages([{ from: "assistant", text: "История диалога очищена. Данные цикла не изменены." }]);
  }

  const lastAssistant = [...messages].reverse().find((message) => message.from === "assistant");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Умный ассистент Luna</h1>
          <p className="text-muted">Локальный режим · отвечает по циклу, самочувствию, поддержке и приватности</p>
        </div>
        <Button variant="outline" onClick={clearHistory}>
          <Trash2 className="h-4 w-4" />
          Очистить историю диалога
        </Button>
      </header>

      <Card className="glass-panel">
        <div className="mb-4 rounded-2xl bg-primarySoft p-3 text-sm text-muted">
          Luna отвечает локально и не заменяет врача. Приватные заметки, интимные данные и имя не передаются в ассистента.
        </div>
        <label className="mb-4 flex items-center gap-3 text-sm">
          <input className="h-5 w-5 accent-primary" type="checkbox" checked={useContext} onChange={(event) => setUseContext(event.target.checked)} />
          Использовать безопасный локальный контекст прогноза
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {quickQuestions.map((item) => (
            <Button key={item} variant="outline" onClick={() => answer(item)}>{item}</Button>
          ))}
        </div>

        <div className="max-h-[52vh] space-y-3 overflow-y-auto rounded-card border border-border bg-card/60 p-3">
          {messages.map((message, index) => (
            <div key={`${message.from}-${index}`} className={`rounded-2xl p-3 text-sm ${message.from === "assistant" ? "bg-primarySoft text-text" : "ml-auto bg-primary text-white md:max-w-[78%]"}`}>
              <p>{message.text}</p>
              {message.sources?.length ? <p className="mt-2 text-xs opacity-75">Источники: {message.sources.join(", ")}</p> : null}
            </div>
          ))}
          {isThinking ? <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted">Luna формирует ответ...</p> : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" disabled={!lastQuestion} onClick={() => answer(lastQuestion)}>
            <RotateCcw className="h-4 w-4" />
            Повторить запрос
          </Button>
          <Button className="hidden md:inline-flex" variant="outline" disabled={!lastAssistant} onClick={() => void navigator.clipboard?.writeText(lastAssistant?.text ?? "")}>
            <Copy className="h-4 w-4" />
            Копировать ответ
          </Button>
          <Button variant="outline" disabled={!isThinking} onClick={() => setIsThinking(false)}>
            Остановить
          </Button>
        </div>

        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (question.trim()) answer(question.trim()); }}>
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Напиши вопрос" />
          <Button size="icon" aria-label="Отправить"><Send className="h-5 w-5" /></Button>
        </form>
      </Card>
    </div>
  );
}
