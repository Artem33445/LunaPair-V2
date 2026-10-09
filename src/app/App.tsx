import { useEffect, useState, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppToast } from "../components/ui/toast";
import { AppLayout } from "../components/layout/AppLayout";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../stores/appStore";
import { VisualEffects } from "../components/layout/VisualEffects";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

const OnboardingPage = lazy(() => import("../features/onboarding/pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
const TodayPage = lazy(() => import("../features/cycle/pages/TodayPage").then((m) => ({ default: m.TodayPage })));
const CalendarPage = lazy(() => import("../features/cycle/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const CycleHistoryPage = lazy(() => import("../features/cycle/pages/CycleHistoryPage").then((m) => ({ default: m.CycleHistoryPage })));
const LogPage = lazy(() => import("../features/daily-log/pages/LogPage").then((m) => ({ default: m.LogPage })));
const StatsPage = lazy(() => import("../features/insights/pages/StatsPage").then((m) => ({ default: m.StatsPage })));
const ProfilePage = lazy(() => import("../features/profile/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const PartnerPage = lazy(() => import("../features/partner/pages/PartnerPage").then((m) => ({ default: m.PartnerPage })));
const AssistantPage = lazy(() => import("../features/assistant/pages/AssistantPage").then((m) => ({ default: m.AssistantPage })));

export function App() {
  const { hydrate, loading, error, profile, setAuthUser } = useAppStore();
  const [booted, setBooted] = useState(() => Boolean(profile));
  useTheme(profile?.theme);

  useEffect(() => {
    let unsubscribe = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (localStorage.getItem("lunapair-has-auth")) {
      timer = setTimeout(async () => {
        try {
          const [{ onAuthStateChanged }, { auth }] = await Promise.all([
            import("firebase/auth"),
            import("../lib/firebase")
          ]);
          unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
          });
        } catch {
          // Fallback if offline
        }
      }, 2500);
    }

    void hydrate().finally(() => setBooted(true));
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [hydrate, setAuthUser]);

  if ((!booted || loading) && !profile) {
    return (
      <main className="app-safe-area flex min-h-dvh items-center justify-center py-5">
        <Card className="w-full max-w-sm space-y-4 text-center">
          <img src="/icons/icon-192.svg" alt="" width={80} height={80} className="mx-auto h-20 w-20 rounded-[1.75rem] shadow-soft" />
          <div>
            <h1 className="text-2xl font-bold">LunaPair</h1>
            <p className="mt-2 text-sm text-muted">Открываем локальный календарь</p>
          </div>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-safe-area flex min-h-dvh items-center justify-center py-5">
        <Card className="max-w-md space-y-4">
          <h1 className="text-xl font-bold">Данные временно недоступны</h1>
          <p className="text-muted">{error}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => void hydrate()}>Попробовать снова</Button>
            <Button variant="danger" onClick={() => void useAppStore.getState().clearAll()}>
              Сбросить приложение
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (!profile?.onboardingCompleted) {
    return (
      <Suspense fallback={null}>
        <VisualEffects />
        <OnboardingPage />
        <AppToast />
      </Suspense>
    );
  }

  const trackerOnly = (element: ReactNode) =>
    profile.role === "partner" ? <Navigate to="/partner" replace /> : element;

  return (
    <>
      <VisualEffects />
      <AppLayout>
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center" />}>
          <Routes>
            <Route path="/" element={<Navigate to={profile.role === "partner" ? "/partner" : "/today"} replace />} />
            <Route path="/today" element={trackerOnly(<TodayPage />)} />
            <Route path="/calendar" element={trackerOnly(<CalendarPage />)} />
            <Route path="/cycles" element={trackerOnly(<CycleHistoryPage />)} />
            <Route path="/log" element={trackerOnly(<LogPage />)} />
            <Route path="/stats" element={trackerOnly(<StatsPage />)} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/partner/calendar" element={<PartnerPage />} />
            <Route path="/partner/support" element={<PartnerPage />} />
            <Route path="/partner/history" element={<PartnerPage />} />
            <Route path="/assistant" element={trackerOnly(<AssistantPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
      <AppToast />
    </>
  );
}
