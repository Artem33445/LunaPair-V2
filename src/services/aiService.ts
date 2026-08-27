import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../lib/firebase";
import type { AdviceTip, AppProfile, DailyLog } from "../types";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface AdviceGenerationContext {
  date: string;
  cycleDay: number;
  currentPhase: string;
  phaseIsEstimated: true;
  averageCycleLength: number;
  averagePeriodLength: number;
  dataConfidence: string;
  irregularityDetected: boolean;
  predictedNextPeriodStart: string;
  predictedRange: {
    start: string;
    end: string;
  };
  recentCycles: Array<{
    startDate: string;
    endDate?: string;
    cycleLength?: number;
    periodLength?: number;
  }>;
  recentLogs: Array<{
    date: string;
    mood?: string;
    wellbeing?: string;
    energyLevel?: string;
    painLevel?: number;
    flow?: string;
    symptoms: string[];
    sleepQuality?: string;
    sleepHours?: number;
  }>;
}

export interface GeneratedAdvicePayload {
  summary: string;
  tips: AdviceTip[];
}

const functions = getFunctions(app);

export async function generateStructuredAdvice(
  context: AdviceGenerationContext
): Promise<GeneratedAdvicePayload> {
  try {
    const generateAdvice = httpsCallable<any, GeneratedAdvicePayload>(functions, "generateAdvice");
    const result = await generateAdvice({ context });
    return result.data;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Не удалось загрузить советы. Проверьте подключение к интернету.");
  }
}

export async function generateDailyInsight(
  profile: AppProfile,
  cycleDay: number,
  phase: string,
  recentLogs: DailyLog[]
): Promise<string> {
  try {
    const generateInsight = httpsCallable<any, { insight: string }>(functions, "generateInsight");
    const result = await generateInsight({ profile, cycleDay, phase, recentLogs });
    return result.data.insight;
  } catch (error) {
    console.error("AI Error:", error);
    return "Не удалось загрузить совет дня. Проверьте подключение к интернету.";
  }
}

export async function sendChatMessageStream(
  profile: AppProfile,
  history: ChatMessage[],
  newMessage: string,
  onUpdate: (text: string) => void,
  cycleDay?: number,
  phase?: string,
  recentLogs?: DailyLog[]
): Promise<string> {
  try {
    // We are no longer streaming directly from the client because standard Firebase Callables don't support it natively.
    // We will simulate a loading state and then return the full response at once.
    onUpdate("Думаю...");
    
    const sendChatMessage = httpsCallable<any, { response: string }>(functions, "sendChatMessage");
    const result = await sendChatMessage({ profile, history, newMessage, cycleDay, phase, recentLogs });
    
    // Pass the full response back
    onUpdate(result.data.response);
    return result.data.response;
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw new Error("Ошибка связи с AI. Попробуйте еще раз.");
  }
}
