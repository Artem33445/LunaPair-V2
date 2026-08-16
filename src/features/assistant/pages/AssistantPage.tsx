import { Send, Trash2, Bot, AlertTriangle, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/field";
import { useAppStore } from "../../../stores/appStore";
import { sendChatMessageStream, type ChatMessage } from "../../../services/aiService";
import { buildAssistantResponse } from "../domain/assistantEngine";

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
  const [useContext, setUseContext] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved) as ChatMessage[];
      } catch {
        return [];
      }
    }
    return [{ role: "model", content: "Привет! Я Luna, твой персональный помощник по женскому здоровью. Ты можешь спрашивать меня о своем цикле, самочувствии или просить совета." }];
  });

  const hasApiKey = Boolean(profile?.geminiApiKey);

  // Local fallback context
  const safeContext = useMemo(
    () => ({
      cycles,
      logs: useContext ? dailyLogs.map(({ note: _note, intimacy: _intimacy, ...log }) => log) : [],
      averageCycleLength: profile?.averageCycleLength ?? 28,
      averagePeriodLength: profile?.averagePeriodLength ?? 5,
      usePersonalContext: useContext,
      recentMessages: messages.slice(-6).map((message) => `${message.role}: ${message.content.slice(0, 180)}`)
    }),
    [cycles, dailyLogs, messages, profile?.averageCycleLength, profile?.averagePeriodLength, useContext]
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(draftKey, question);
  }, [question]);

  async function answer(text: string) {
    setLastQuestion(text);
    setIsThinking(true);
    setQuestion("");
    
    setMessages((current) => [...current, { role: "user", content: text }]);
    setStreamingResponse("");

    if (hasApiKey) {
      try {
        const responseText = await sendChatMessageStream(
          profile!.geminiApiKey!, 
          profile!, 
          messages, 
          text,
          (chunk) => {
            setStreamingResponse(chunk);
          }
        );
        setMessages((current) => [...current, { role: "model", content: responseText }]);
      } catch (error) {
        setMessages((current) => [...current, { role: "model", content: "Произошла ошибка связи с ИИ. Проверьте ваш API-ключ в настройках или интернет-соединение." }]);
      }
      setStreamingResponse("");
      setIsThinking(false);
    } else {
      // Local Fake Engine
      window.setTimeout(() => {
        const response = buildAssistantResponse(text, safeContext);
        setMessages((current) => [...current, { role: "model", content: response.answer }]);
        setIsThinking(false);
      }, 500);
    }
  }

  function clearHistory() {
    localStorage.removeItem(storageKey);
    setMessages([{ role: "model", content: "История диалога очищена." }]);
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === "model");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="w-8 h-8 text-primary" />Умный ассистент Luna</h1>
          <p className="text-muted">
            {hasApiKey ? "Подключён ИИ-ассистент" : "Локальный режим без ИИ"}
          </p>
        </div>
        <Button variant="outline" onClick={clearHistory}>
          <Trash2 className="h-4 w-4" />
          Очистить историю
        </Button>
      </header>

      {!hasApiKey && (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-4 mb-4 flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-coral mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-coral">Включите полноценный ИИ</h3>
            <p className="text-sm text-coral mt-1">Сейчас работает простой скрипт-ответчик. Чтобы Luna отвечала умнее, добавьте API-ключ ИИ.</p>
            <Button asChild variant="outline" className="mt-3 border-coral text-coral hover:bg-coral/20">
              <Link to="/profile">Перейти в настройки</Link>
            </Button>
          </div>
        </div>
      )}

      <Card className="glass-panel flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
        <div className="mb-4 rounded-2xl bg-primarySoft p-3 text-sm text-muted flex gap-2">
           <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
           Luna не заменяет врача. Приватные заметки, интимные данные и ваше имя не передаются в ИИ.
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          {quickQuestions.map((item) => (
            <Button key={item} variant="outline" size="default" onClick={() => void answer(item)}>{item}</Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 rounded-card border border-border bg-card/60 p-3 mb-4">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm ${message.role === "model" ? "bg-primarySoft text-text mr-8" : "ml-auto bg-primary text-white md:max-w-[78%] ml-8"}`}>
              {message.content.split("\n").map((line, i) => (
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
