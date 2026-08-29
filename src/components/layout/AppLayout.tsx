import { BarChart3, CalendarDays, HeartHandshake, Home, MessageCircle, Plus, ScrollText, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../stores/appStore";
import { Button } from "../ui/button";

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
  const authUser = useAppStore((state) => state.authUser);
  const navigate = useNavigate();
  const items = role === "partner" ? partnerNav : trackerNav;

  return (
    <div className="app-shell relative">
      <aside className="glass-panel fixed left-0 top-0 z-30 hidden h-dvh w-72 border-r border-border p-5 pt-[max(1.25rem,var(--safe-top))] lg:block">
        <div className="mb-8 flex items-center gap-3">
          <img src="/icons/lunapair.svg" alt="" className="h-11 w-11 rounded-2xl" />
          <div>
            <div className="font-bold">LunaPair</div>
            <div className="text-xs text-muted flex items-center gap-1.5">
              {authUser ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Облачная синхронизация
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                  Локальный режим
                </>
              )}
            </div>
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

      <main className="app-scroll app-safe-area flex min-h-dvh min-w-0 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,var(--safe-top))] md:pb-8 md:pt-4 lg:ml-72">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/85 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur-2xl lg:hidden shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center">
          <MobileItem to={role === "partner" ? "/partner" : "/today"} label="Сегодня" icon={Home} />
          <MobileItem to={role === "partner" ? "/partner/calendar" : "/calendar"} label="Календарь" icon={CalendarDays} />
          
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.88 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/85 text-white shadow-md shadow-primary/25 transition-shadow hover:shadow-lg hover:shadow-primary/35 active:shadow-sm"
              onClick={() => navigate(role === "partner" ? "/partner/support" : "/log")}
              aria-label={role === "partner" ? "Поддержка" : "Добавить запись"}
            >
              {role === "partner" ? <HeartHandshake className="h-6 w-6" /> : <Plus className="h-6 w-6 stroke-[2.5]" />}
            </motion.button>
          </div>

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
  icon: Icon
}: {
  to: string;
  label: string;
  icon: typeof Home;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/partner" || to === "/today"}
      className={({ isActive }) =>
        cn(
          "group relative flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold transition-all duration-200 active:scale-90",
          isActive ? "text-primary font-bold" : "text-muted hover:text-text"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
            {isActive && (
              <motion.span
                layoutId="nav-dot"
                className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </div>
          <span className="leading-tight tracking-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}
