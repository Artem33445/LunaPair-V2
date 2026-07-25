import { BarChart3, CalendarDays, HeartHandshake, Home, MessageCircle, Plus, ScrollText, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../stores/appStore";
import { Button } from "../ui/button";
import { VisualEffects } from "./VisualEffects";

const trackerNav = [
  { to: "/today", label: "Сегодня", icon: Home, trackerOnly: true },
  { to: "/calendar", label: "Календарь", icon: CalendarDays, trackerOnly: true },
  { to: "/cycles", label: "Циклы", icon: ScrollText, trackerOnly: true },
  { to: "/stats", label: "Статистика", icon: BarChart3, trackerOnly: true },
  { to: "/assistant", label: "Ассистент", icon: MessageCircle, trackerOnly: true },
  { to: "/partner", label: "Партнёр", icon: HeartHandshake, trackerOnly: false },
  { to: "/profile", label: "Профиль", icon: UserRound, trackerOnly: false }
];

const partnerNav = [
  { to: "/partner", label: "Сегодня", icon: Home, trackerOnly: false },
  { to: "/partner/calendar", label: "Календарь", icon: CalendarDays, trackerOnly: false },
  { to: "/partner/support", label: "Поддержка", icon: HeartHandshake, trackerOnly: false },
  { to: "/partner/history", label: "История", icon: ScrollText, trackerOnly: false },
  { to: "/profile", label: "Профиль", icon: UserRound, trackerOnly: false }
];

export function AppLayout({ children }: { children: ReactNode }) {
  const role = useAppStore((state) => state.profile?.role);
  const navigate = useNavigate();
  const items = role === "partner" ? partnerNav : trackerNav;

  return (
    <div className="app-shell">
      <VisualEffects />
      <aside className="glass-panel fixed left-0 top-0 z-30 hidden h-dvh w-72 border-r border-border p-5 pt-[max(1.25rem,var(--safe-top))] lg:block">
        <div className="mb-8 flex items-center gap-3">
          <img src="/icons/lunapair.svg" alt="" className="h-11 w-11 rounded-2xl" />
          <div>
            <div className="font-bold">LunaPair</div>
            <div className="text-xs text-muted">Локальный режим</div>
          </div>
        </div>
        <nav className="space-y-2">
          {items.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
        {role !== "partner" ? (
          <Button className="mt-6 w-full" onClick={() => navigate("/log")}>
            <Plus className="h-5 w-5" />
            Добавить запись
          </Button>
        ) : null}
      </aside>

      <main className="app-scroll app-safe-area flex min-h-dvh min-w-0 flex-col pb-[calc(var(--mobile-nav-height)+var(--safe-bottom)+1rem)] pt-[max(1.25rem,var(--safe-top))] md:pb-[calc(var(--mobile-nav-height)+var(--safe-bottom)+1.5rem)] md:pt-8 lg:ml-72 lg:pb-8">
        <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-[max(0.75rem,var(--safe-left))] pb-[max(0.5rem,var(--safe-bottom))] pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
          <MobileItem to={role === "partner" ? "/partner" : "/today"} label="Сегодня" icon={Home} />
          <MobileItem to={role === "partner" ? "/partner/calendar" : "/calendar"} label="Календарь" icon={CalendarDays} />
          <button
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-soft transition-all duration-200 active:scale-[0.95] hover:brightness-105"
            onClick={() => navigate(role === "partner" ? "/partner/support" : "/log")}
            aria-label={role === "partner" ? "Поддержка" : "Добавить"}
          >
            {role === "partner" ? <HeartHandshake className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
          </button>
          <MobileItem to={role === "partner" ? "/partner/history" : "/cycles"} label={role === "partner" ? "История" : "Циклы"} icon={ScrollText} />
          <MobileItem to="/profile" label="Профиль" icon={UserRound} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ item }: { item: (typeof trackerNav)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/partner" || item.to === "/today"}
      className={({ isActive }) =>
        cn(
          "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
          isActive ? "bg-primarySoft text-primary" : "text-muted hover:bg-primarySoft hover:text-text"
        )
      }
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </NavLink>
  );
}

function MobileItem({
  to,
  label,
  icon: Icon,
  hidden
}: {
  to: string;
  label: string;
  icon: typeof Home;
  hidden?: boolean;
}) {
  if (hidden) return <span aria-hidden="true" />;
  return (
    <NavLink
      to={to}
      end={to === "/partner" || to === "/today"}
      className={({ isActive }) =>
        cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-all duration-200 active:scale-[0.95]", isActive ? "text-primary" : "text-muted")
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
