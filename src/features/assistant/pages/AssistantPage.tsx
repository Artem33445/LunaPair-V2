import { Send, Trash2, Bot, AlertTriangle, ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/field";
import { useAppStore } from "../../../stores/appStore";
import { sendChatMessageStream, type ChatMessage } from "../../../services/aiService";
import { predictCycle } from "../../cycle/domain/cycleCalculations";

const storageKey = "lunapair-assistant-history";
const draftKey = "lunapair-assistant-draft";

export function AssistantPage() {
  const navigate = useNavigate();
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
          return parsed.filter((m) => m && typeof m.role === "string");
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
    <div className="flex flex-col h-[calc(100dvh-var(--safe-top)-var(--mobile-nav-height)-1.5rem)] overflow-hidden pb-1">
      <header className="flex items-center justify-between gap-2 pb-2 shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0" onClick={() => navigate(-1)} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary shrink-0" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Luna AI</h1>
              <p className="text-[11px] text-muted leading-none">Персональный ассистент</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-coral rounded-full" onClick={clearHistory} aria-label="Очистить историю">
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      <div className="py-1.5 px-2 text-[11px] text-muted flex items-center gap-1.5 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span>Приватные заметки и имя не передаются в AI. Не заменяет врача.</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2 overscroll-contain">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-2xl p-3.5 text-sm leading-relaxed ${
              message.role === "model"
                ? "bg-card border border-border/60 text-text mr-6 rounded-tl-sm shadow-sm"
                : "ml-auto bg-primary text-white max-w-[85%] rounded-tr-sm shadow-sm"
            }`}
          >
            {(message.content || "").split("\n").map((line, i) => (
              <p key={i} className="mb-1 last:mb-0">{line}</p>
            ))}
          </div>
        ))}
        {isThinking && streamingResponse ? (
          <div className="rounded-2xl rounded-tl-sm p-3.5 text-sm bg-card border border-border/60 text-text mr-6 shadow-sm leading-relaxed">
            {streamingResponse.split("\n").map((line, i) => (
              <p key={i} className="mb-1 last:mb-0">{line}</p>
            ))}
          </div>
        ) : isThinking ? (
          <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 p-3 text-xs text-muted w-fit animate-pulse flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
            Luna печатает...
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="pt-2 flex gap-2 shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) void answer(question.trim());
        }}
      >
        <Input
          value={question}
          disabled={isThinking}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Спросить Luna..."
          className="rounded-full bg-card border-border px-4 text-sm min-h-11"
        />
        <Button
          size="icon"
          aria-label="Отправить"
          disabled={isThinking || !question.trim()}
          className="rounded-full shrink-0 w-11 h-11 p-0 flex items-center justify-center shadow-md"
        >
          <Send className="h-4 w-4 ml-0.5" />
        </Button>
      </form>
    </div>
  );
}
