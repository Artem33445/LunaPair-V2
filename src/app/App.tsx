import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppToast } from "../components/ui/toast";
import { AppLayout } from "../components/layout/AppLayout";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../stores/appStore";
import { OnboardingPage } from "../features/onboarding/pages/OnboardingPage";
import { TodayPage } from "../features/cycle/pages/TodayPage";
import { CalendarPage } from "../features/cycle/pages/CalendarPage";
import { CycleHistoryPage } from "../features/cycle/pages/CycleHistoryPage";
import { LogPage } from "../features/daily-log/pages/LogPage";
import { StatsPage } from "../features/insights/pages/StatsPage";
import { ProfilePage } from "../features/profile/pages/ProfilePage";
import { PartnerPage } from "../features/partner/pages/PartnerPage";
import { AssistantPage } from "../features/assistant/pages/AssistantPage";
import { Card } from "../components/ui/card";

export function App() {
  const { hydrate, loading, error, profile } = useAppStore();
  const [booted, setBooted] = useState(false);
  useTheme(profile?.theme);

  useEffect(() => {
    void hydrate().finally(() => setBooted(true));
  }, [hydrate]);

  if (!booted || loading) {
    return (
      <main className="app-safe-area flex min-h-dvh items-center justify-center py-5">
        <Card className="w-full max-w-sm space-y-4 text-center">
          <img src="/icons/icon-192.svg" alt="" className="mx-auto h-20 w-20 rounded-[1.75rem] shadow-soft" />
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
        <Card className="max-w-md">
          <h1 className="text-xl font-bold">Локальные данные недоступны</h1>
          <p className="mt-2 text-muted">{error}</p>
        </Card>
      </main>
    );
  }

  if (!profile?.onboardingCompleted) {
    return (
      <>
        <OnboardingPage />
        <AppToast />
      </>
    );
  }

  const trackerOnly = (element: ReactNode) =>
    profile.role === "partner" ? <Navigate to="/partner" replace /> : element;

  return (
    <>
      <AppLayout>
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
      </AppLayout>
      <AppToast />
    </>
  );
}
