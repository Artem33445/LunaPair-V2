import { motion } from "framer-motion";
import { CalendarDays, HeartHandshake, Moon, Sun, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAfter } from "date-fns";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { FieldLabel, Input } from "../../../components/ui/field";
import { clamp, todayIso } from "../../../lib/utils";
import { useAppStore } from "../../../stores/appStore";
import type { ThemePreference, UserRole } from "../../../types";

import { loginWithGoogle } from "../../../lib/firebase";

type Stage = "splash" | "welcome" | "auth" | "role" | "tracker" | "partner";

const today = todayIso();

export function OnboardingPage() {
  const complete = useAppStore((state) => state.completeOnboarding);
  const enableDemo = useAppStore((state) => state.enablePartnerDemo);
  const [stage, setStage] = useState<Stage>(() => (localStorage.getItem("lunapair-splash") ? "auth" : "splash"));
  const [role, setRole] = useState<UserRole>("tracker");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [lastStart, setLastStart] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (stage !== "splash") return;
    const timer = window.setTimeout(() => {
      localStorage.setItem("lunapair-splash", "seen");
      setStage("welcome");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [stage]);

  const authUser = useAppStore((state) => state.authUser);
  useEffect(() => {
    if (stage === "auth" && authUser) {
      window.queueMicrotask(() => {
        if (authUser.displayName && !name) {
          setName(authUser.displayName);
        }
        setStage("role");
      });
    }
  }, [stage, authUser, name]);

  useEffect(() => {
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const trimmedName = name.trim();

  function clearValidation() {
    setValidationMessage("");
  }

  function trackerStepError(currentStep = step) {
    if (currentStep === 0 && !trimmedName) return "Введите имя, чтобы продолжить.";
    if (currentStep === 1 && !lastStart) return "Выберите первый день последних месячных.";
    if (currentStep === 1 && isAfter(new Date(lastStart), new Date())) return "Дата не может быть в будущем.";
    if (currentStep === 2 && (!Number.isFinite(cycleLength) || cycleLength < 15 || cycleLength > 60)) {
      return "Укажите длину цикла от 15 до 60 дней.";
    }
    if (currentStep === 3 && (!Number.isFinite(periodLength) || periodLength < 1 || periodLength > 14)) {
      return "Укажите продолжительность месячных от 1 до 14 дней.";
    }
    return "";
  }

  function partnerStepError(currentStep = step) {
    if (currentStep === 1 && !trimmedName) return "Введите имя, чтобы продолжить.";
    if (currentStep === 2 && !trimmedName) return "Введите имя перед открытием демо-режима.";
    return "";
  }

  function goTrackerNext() {
    const error = trackerStepError();
    if (error) {
      setValidationMessage(error);
      return;
    }
    clearValidation();
    setStep(step + 1);
  }

  function goPartnerNext() {
    const error = partnerStepError();
    if (error) {
      setValidationMessage(error);
      return;
    }
    clearValidation();
    setStep(step + 1);
  }

  function openTrackerApp() {
    const error = trackerStepError(0) || trackerStepError(1) || trackerStepError(2) || trackerStepError(3);
    if (error) {
      setValidationMessage(error);
      return;
    }
    void complete({
      role: "tracker",
      name: trimmedName,
      lastPeriodStart: lastStart,
      averageCycleLength: cycleLength,
      averagePeriodLength: periodLength,
      theme
    });
  }

  function openPartnerDemo() {
    const error = partnerStepError(2);
    if (error) {
      setValidationMessage(error);
      return;
    }
    void enableDemo(trimmedName);
  }

  if (stage === "splash") {
    return (
      <main className="onboarding-screen app-safe-area grid place-items-center py-5">
        <motion.section initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
          <img src="/icons/icon-192.svg" alt="LunaPair" className="mx-auto h-28 w-28 rounded-[2rem] shadow-soft" />
        </motion.section>
      </main>
    );
  }

  if (stage === "welcome") {
    return (
      <main className="onboarding-screen app-safe-area grid place-items-center py-5">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <img src="/icons/icon-192.svg" alt="LunaPair" className="mx-auto h-24 w-24 rounded-[2rem] shadow-soft" />
          <h1 className="mt-6 text-4xl font-bold">LunaPair</h1>
          <p className="mt-3 text-muted">Цикл, забота и понимание — в одном месте</p>
          <Button className="mt-10 min-w-48" size="lg" onClick={() => setStage("auth")}>Войти в LunaPair</Button>
        </motion.section>
      </main>
    );
  }

  if (stage === "auth") {
    return (
      <main className="onboarding-screen app-safe-area grid place-items-center py-5">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm w-full px-5">
          <img src="/icons/icon-192.svg" alt="LunaPair" className="mx-auto h-20 w-20 rounded-[1.75rem] shadow-soft" />
          <h2 className="mt-6 text-2xl font-bold">Выберите способ входа</h2>
          <p className="mt-3 text-sm text-muted">Синхронизация позволит использовать приложение на разных устройствах и делиться циклом с партнёром.</p>
          
          <div className="mt-8 flex flex-col gap-4">
            <Button 
              className="w-full flex items-center justify-center gap-3 bg-white text-black border border-gray-300 hover:bg-gray-50 h-14 text-base"
              onClick={async () => {
                setIsLoggingIn(true);
                try {
                  const user = await loginWithGoogle();
                  if (user?.displayName) {
                    setName(user.displayName);
                  }
                  setStage("role");
                } catch {
                  setValidationMessage("Не удалось войти. Попробуйте еще раз.");
                } finally {
                  setIsLoggingIn(false);
                }
              }}
            >
              {isLoggingIn ? "Вход..." : "Вход через Google (Синхронизация)"}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-14 text-base font-normal text-muted hover:text-foreground"
              onClick={() => setStage("role")}
            >
              Продолжить локально (Без регистрации)
            </Button>
            {validationMessage && <p className="text-sm text-coral">{validationMessage}</p>}
          </div>
        </motion.section>
      </main>
    );
  }

  if (stage === "role") {
    return (
      <Shell title="Как ты будешь пользоваться LunaPair?" subtitle="Роль можно будет изменить позже в настройках">
        <div className="grid gap-4 md:grid-cols-2">
          <RoleCard role="tracker" active={role === "tracker"} setRole={(value) => { setRole(value); clearValidation(); }} icon={<CalendarDays />} title="Я девушка" text="Хочу отслеживать свой цикл, самочувствие и симптомы" />
          <RoleCard role="partner" active={role === "partner"} setRole={(value) => { setRole(value); clearValidation(); }} icon={<HeartHandshake />} title="Я парень" text="Хочу лучше понимать цикл и поддерживать партнёршу" />
        </div>
        <Button className="mt-6 w-full" size="lg" onClick={() => { clearValidation(); setStage(role === "tracker" ? "tracker" : "partner"); }}>
          Продолжить
        </Button>
      </Shell>
    );
  }

  if (stage === "partner") {
    const titles = ["Режим партнёра", "Как к тебе обращаться?", "Будущее подключение"];
    return (
      <Shell title={titles[step]} subtitle={`${step + 1} из 3`}>
        {step === 0 ? (
          <p className="text-muted">В будущем здесь можно будет подключиться к партнёрше по защищённому коду. В этой версии доступен демонстрационный режим.</p>
        ) : null}
        {step === 1 ? <NameField name={name} setName={(value) => { setName(value); clearValidation(); }} /> : null}
        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="code">Шестизначный код</FieldLabel>
              <Input id="code" value={code} maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setMessage("Синхронизация появится в следующей версии. Сейчас открыт демонстрационный профиль")}>
              Подключиться
            </Button>
            {message ? <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted">{message}</p> : null}
          </div>
        ) : null}
        <div className="mt-6 flex gap-3">
          {step > 0 ? <Button variant="outline" onClick={() => { clearValidation(); setStep(step - 1); }}>Назад</Button> : null}
          {step < 2 ? (
            <Button className="flex-1" onClick={goPartnerNext}>Дальше</Button>
          ) : (
            <Button className="flex-1" onClick={openPartnerDemo}>Открыть демо-режим</Button>
          )}
        </div>
        {validationMessage ? <ValidationMessage>{validationMessage}</ValidationMessage> : null}
      </Shell>
    );
  }

  const currentTrackerError = trackerStepError();
  return (
    <Shell title={["Как к тебе обращаться?", "Начало последних месячных", "Средняя длина цикла", "Продолжительность месячных", "Тема", "Готово"][step]} subtitle={`${step + 1} из 6`}>
      <Progress value={(step + 1) / 6} />
      {step === 0 ? <NameField name={name} setName={(value) => { setName(value); clearValidation(); }} /> : null}
      {step === 1 ? (
        <div className="space-y-2">
          <FieldLabel htmlFor="lastStart">Первый день последних месячных</FieldLabel>
          <Input id="lastStart" type="date" max={today} value={lastStart} onChange={(event) => { setLastStart(event.target.value); clearValidation(); }} />
          {currentTrackerError && step === 1 ? <p className="text-sm text-coral">{currentTrackerError}</p> : null}
        </div>
      ) : null}
      {step === 2 ? <Stepper value={cycleLength} min={15} max={60} setValue={(value) => { setCycleLength(value); clearValidation(); }} label="Дней в цикле" /> : null}
      {step === 3 ? <Stepper value={periodLength} min={1} max={14} setValue={(value) => { setPeriodLength(value); clearValidation(); }} label="Дней месячных" /> : null}
      {step === 4 ? <ThemeChoice theme={theme} setTheme={(value) => { setTheme(value); clearValidation(); }} /> : null}
      {step === 5 ? (
        <Card className="bg-primarySoft shadow-none">
          <p className="font-semibold">{name.trim() ? `Привет, ${name.trim()}!` : "Привет!"}</p>
          <p className="mt-2 text-sm text-muted">Цикл {cycleLength} дней, месячные {periodLength} дней. Все данные будут храниться только на этом устройстве.</p>
        </Card>
      ) : null}
      <div className="mt-6 flex gap-3">
        {step > 0 ? <Button variant="outline" onClick={() => { clearValidation(); setStep(step - 1); }}>Назад</Button> : null}
        {step < 5 ? (
          <Button className="flex-1" disabled={Boolean(currentTrackerError)} onClick={goTrackerNext}>Дальше</Button>
        ) : (
          <Button className="flex-1" onClick={openTrackerApp}>
            Открыть LunaPair
          </Button>
        )}
      </div>
      {validationMessage ? <ValidationMessage>{validationMessage}</ValidationMessage> : null}
    </Shell>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="onboarding-screen app-safe-area flex items-center justify-center py-4">
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <Card className="onboarding-panel">
          <img src="/icons/lunapair.svg" alt="" className="mb-5 h-12 w-12 rounded-2xl" />
          <p className="text-sm font-semibold text-primary">{subtitle}</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{title}</h1>
          <div className="mt-6">{children}</div>
        </Card>
      </motion.section>
    </main>
  );
}

function RoleCard({ role, active, setRole, icon, title, text }: { role: UserRole; active: boolean; setRole: (role: UserRole) => void; icon: React.ReactNode; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`min-h-44 rounded-card border p-5 text-left transition ${active ? "border-primary bg-primarySoft" : "border-border bg-card hover:bg-primarySoft"}`}
      onClick={() => setRole(role)}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary">{icon}</span>
      <span className="block text-lg font-bold">{title}</span>
      <span className="mt-2 block text-sm text-muted">{text}</span>
    </button>
  );
}

function NameField({ name, setName }: { name: string; setName: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor="name">Имя</FieldLabel>
      <Input id="name" value={name} required onChange={(event) => setName(event.target.value)} placeholder="Например, Евгения" />
      <p className="text-sm text-muted">Обязательное поле. Имя хранится только на этом устройстве.</p>
    </div>
  );
}

function Stepper({ value, min, max, setValue, label }: { value: number; min: number; max: number; setValue: (value: number) => void; label: string }) {
  return (
    <div className="space-y-3">
      <FieldLabel htmlFor={label}>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setValue(clamp(value - 1, min, max))}>−</Button>
        <Input id={label} type="number" min={min} max={max} value={value} onChange={(event) => setValue(clamp(Number(event.target.value), min, max))} />
        <Button variant="outline" size="icon" onClick={() => setValue(clamp(value + 1, min, max))}>+</Button>
      </div>
      <p className="text-sm text-muted">Допустимый диапазон: {min}–{max}.</p>
    </div>
  );
}

function ThemeChoice({ theme, setTheme }: { theme: ThemePreference; setTheme: (theme: ThemePreference) => void }) {
  const options = useMemo(
    () => [
      { value: "light" as const, label: "Светлая", icon: Sun },
      { value: "dark" as const, label: "Тёмная", icon: Moon },
      { value: "system" as const, label: "Как на устройстве", icon: Wand2 }
    ],
    []
  );
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button key={option.value} type="button" aria-pressed={theme === option.value} onClick={() => setTheme(option.value)} className={`rounded-card border p-4 text-left ${theme === option.value ? "border-primary bg-primarySoft" : "border-border bg-card"}`}>
            <Icon className="mb-4 h-6 w-6 text-primary" />
            <span className="font-semibold">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return <div className="mb-6 h-2 rounded-full bg-primarySoft"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value * 100}%` }} /></div>;
}

function ValidationMessage({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-2xl bg-coral/10 p-3 text-sm font-semibold text-coral">{children}</p>;
}
