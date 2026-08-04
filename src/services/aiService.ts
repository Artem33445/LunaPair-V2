import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppProfile, DailyLog } from "../types";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

const SYSTEM_PROMPT = `
Ты - заботливый, эмпатичный и профессиональный виртуальный помощник женского здоровья в приложении LunaPair. 
Твоя цель - давать персонализированные инсайты по менструальному циклу, поддерживать и информировать пользователя.

Правила:
1. Всегда будь вежливой, поддерживающей и теплой.
2. Используй медицински точную, но понятную терминологию.
3. Не ставь диагнозы и не назначай лечение. Обязательно напоминай про консультацию с врачом, если симптомы вызывают опасения (сильная боль, нетипичные выделения и т.д.).
4. Форматируй текст так, чтобы его было удобно читать на экране мобильного телефона (используй абзацы, эмодзи, списки).
5. Обращайся к пользователю на "ты".
6. Если тебя спрашивают о чём-то, не связанном со здоровьем, отношениями, психологией или циклом, вежливо скажи, что ты специализируешься только на женском здоровье и поддержке.
`;

export async function generateDailyInsight(
  apiKey: string,
  profile: AppProfile,
  cycleDay: number,
  phase: string,
  recentLogs: DailyLog[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });

  const todayLog = recentLogs.find(l => l.date === new Date().toISOString().split("T")[0]);
  
  let prompt = `Сегодня ${cycleDay} день цикла. Текущая фаза: ${phase}. Средняя длина цикла: ${profile.averageCycleLength} дней.\n`;
  if (todayLog) {
    prompt += `Самочувствие сегодня: Настроение - ${todayLog.mood}, Энергия - ${todayLog.energyLevel ?? 'не указано'}.\n`;
    if (todayLog.symptoms && todayLog.symptoms.length > 0) {
      prompt += `Симптомы: ${todayLog.symptoms.join(", ")}.\n`;
    }
  }

  prompt += `\nНапиши короткий, поддерживающий и полезный инсайт на сегодняшний день (2-3 предложения). Сделай акцент на том, что нормально чувствовать себя так в эту фазу цикла, и дай один маленький совет (например, по питанию, отдыху или активности). Добавь 1-2 эмодзи.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Не удалось загрузить совет дня. Проверьте подключение к интернету или правильность API-ключа в настройках.";
  }
}

export async function sendChatMessage(
  apiKey: string,
  profile: AppProfile,
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });

  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  });

  try {
    const context = `(Контекст пользователя: средний цикл ${profile.averageCycleLength} дней). `;
    const result = await chat.sendMessage(context + newMessage);
    return result.response.text();
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw new Error("Ошибка связи с ИИ. Проверьте API ключ и интернет.");
  }
}
