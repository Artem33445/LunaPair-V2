import { readFileSync, writeFileSync } from "fs";

// 1. Fix AssistantPage.tsx
let ast = readFileSync("src/features/assistant/pages/AssistantPage.tsx", "utf-8");
ast = ast.replace(/size="sm"/g, 'size="default"');
writeFileSync("src/features/assistant/pages/AssistantPage.tsx", ast);

// 2. Fix TodayPage.tsx
let today = readFileSync("src/features/cycle/pages/TodayPage.tsx", "utf-8");
today = today.replace("{trackerMode && profile ?", "{profile?.role !== 'partner' && profile ?");
writeFileSync("src/features/cycle/pages/TodayPage.tsx", today);

// 3. Fix aiService.ts
let ai = readFileSync("src/services/aiService.ts", "utf-8");
ai = ai.replace(
  "prompt += `Самочувствие сегодня: Настроение - ${todayLog.mood}, Энергия - ${todayLog.energy}, Сон - ${todayLog.sleep}.\\n`;",
  "prompt += `Самочувствие сегодня: Настроение - ${todayLog.mood}, Энергия - ${todayLog.energyLevel ?? 'не указано'}.\\n`;"
);
writeFileSync("src/services/aiService.ts", ai);
