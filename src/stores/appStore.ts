import { create } from "zustand";
import { addDays, differenceInCalendarDays, formatISO, parseISO } from "date-fns";
import type {
  AppProfile,
  CycleEntry,
  DailyLog,
  PartnerSharingPreferences,
  PartnerSupportPreferences,
  ThemePreference,
  UserRole
} from "../types";
import { User } from "firebase/auth";
import { createDemoData, defaultSharing } from "../features/cycle/domain/demoData";
import { repositories } from "../db/repositories/localRepositories";
import { createBackup } from "../services/exportService";
import { parseBackup } from "../services/importService";
import { id, todayIso } from "../lib/utils";
import { normalizePartnerSharing } from "../features/partner/domain/partnerPermissions";

const iso = (date: Date) => formatISO(date, { representation: "date" });

interface OnboardingInput {
  role: UserRole;
  name: string;
  lastPeriodStart?: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  theme: ThemePreference;
}

type DailyLogInput = Omit<DailyLog, "id" | "source" | "createdAt" | "updatedAt">;

interface AppState {
  authUser?: User | null;
  profile?: AppProfile;
  cycles: CycleEntry[];
  dailyLogs: DailyLog[];
  loading: boolean;
  error?: string;
  toast?: string;
  setAuthUser: (user: User | null) => void;
  hydrate: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  enablePartnerDemo: (name: string) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  generatePartnerAccessCode: () => Promise<string | undefined>;
  confirmPartnerAccessCode: (code: string) => Promise<void>;
  updateSharing: (sharing: PartnerSharingPreferences) => Promise<void>;
  setPartnerAccessPaused: (paused: boolean) => Promise<void>;
  disconnectPartner: () => Promise<void>;
  setSupportPreferences: (preferences: PartnerSupportPreferences) => Promise<void>;
  setHidePrivateMarkers: (hidden: boolean) => Promise<void>;
  setDisableAnimatedBackground: (disabled: boolean) => Promise<void>;
  startPeriod: (date?: string) => Promise<void>;
  endPeriod: (date?: string) => Promise<void>;
  saveDailyLog: (log: DailyLogInput) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<void>;
  deleteDailyLogByDate: (date: string) => Promise<void>;
  exportJson: () => string | undefined;
  importJson: (json: string) => Promise<void>;
  clearAll: () => Promise<void>;
  dismissToast: () => void;
}

function now() {
  return new Date().toISOString();
}

function clearLunaPairBrowserState() {
  if (typeof localStorage === "undefined") return;
  Object.keys(localStorage)
    .filter((key) => key.startsWith("lunapair-"))
    .forEach((key) => localStorage.removeItem(key));
}

function deriveCycleLengths(cycles: CycleEntry[]) {
  return cycles
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((cycle, index, sorted) => {
      const next = sorted[index + 1];
      if (!next) return cycle;
      return {
        ...cycle,
        cycleLength: differenceInCalendarDays(parseISO(next.startDate), parseISO(cycle.startDate))
      };
    });
}

async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  await repositories.profile.save(profile);
  await repositories.cycles.clear();
  await repositories.cycles.bulkPut(cycles);
  await repositories.dailyLogs.clear();
  await repositories.dailyLogs.bulkPut(logs);
}

function canWriteAsTracker(profile: AppProfile | undefined) {
  return profile?.role !== "partner";
}

function generateSixDigitCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  authUser: undefined,
  cycles: [],
  dailyLogs: [],
  loading: true,

  setAuthUser: (user) => set({ authUser: user }),

  hydrate: async () => {
    set({ loading: true, error: undefined });
    try {
      const [profile, cycles, dailyLogs] = await Promise.all([
        repositories.profile.get(),
        repositories.cycles.list(),
        repositories.dailyLogs.list()
      ]);
      const normalized = profile ? { ...profile, partnerSharing: normalizePartnerSharing(profile.partnerSharing) } : undefined;
      set({ profile: normalized, cycles, dailyLogs, loading: false });
    } catch {
      set({
        loading: false,
        error:
          "Не удалось прочитать локальные данные. Перезагрузи приложение или восстанови данные из резервной копии"
      });
    }
  },

  completeOnboarding: async (input) => {
    const createdAt = now();
    const profile: AppProfile = {
      id: "local-profile",
      role: input.role,
      name: input.name.trim(),
      averageCycleLength: input.averageCycleLength,
      averagePeriodLength: input.averagePeriodLength,
      theme: input.theme,
      onboardingCompleted: true,
      partnerSharing: defaultSharing,
      supportPreferences: {
        preferredSupport: ["Спросить, нужна ли помощь, и не настаивать"],
        avoidWhenPossible: "",
        reassuranceText: "Я рядом, но не буду давить.",
        updatedAt: createdAt
      },
      partnerInviteConfirmed: false,
      hidePrivateMarkers: false,
      createdAt,
      updatedAt: createdAt
    };
    const cycles: CycleEntry[] =
      input.role === "tracker" && input.lastPeriodStart
        ? [
            {
              id: id("cycle"),
              startDate: input.lastPeriodStart,
              endDate: iso(addDays(parseISO(input.lastPeriodStart), input.averagePeriodLength - 1)),
              periodLength: input.averagePeriodLength,
              cycleLength: input.averageCycleLength,
              source: "user",
              createdAt,
              updatedAt: createdAt
            }
          ]
        : [];
    await persistAll(profile, cycles, []);
    localStorage.setItem("lunapair-onboarding", "done");
    localStorage.setItem("lunapair-theme", input.theme);
    set({ profile, cycles, dailyLogs: [], toast: "Профиль создан" });
  },

  enablePartnerDemo: async (name) => {
    const demo = createDemoData();
    demo.profile.name = name.trim();
    await persistAll(demo.profile, demo.cycles, demo.logs);
    await repositories.partnerConnection.setDemoEnabled(true);
    localStorage.setItem("lunapair-onboarding", "done");
    set({
      profile: demo.profile,
      cycles: demo.cycles,
      dailyLogs: demo.logs,
      toast: "Открыт демонстрационный профиль"
    });
  },

  setTheme: async (theme) => {
    const profile = get().profile;
    localStorage.setItem("lunapair-theme", theme);
    if (!profile) return;
    const updated = { ...profile, theme, updatedAt: now() };
    await repositories.profile.save(updated);
    set({ profile: updated, toast: "Тема сохранена" });
  },

  setRole: async (role) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, role, updatedAt: now() };
    await repositories.profile.save(updated);
    set({ profile: updated, toast: "Роль изменена" });
  },

  generatePartnerAccessCode: async () => {
    const profile = get().profile;
    if (!profile) return undefined;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Вернись в режим девушки, чтобы создать ключ" });
      return undefined;
    }
    const code = generateSixDigitCode();
    const updated = {
      ...profile,
      partnerInviteCode: code,
      partnerInviteConfirmed: false,
      partnerInviteConfirmedAt: undefined,
      partnerSharing: {
        ...normalizePartnerSharing(profile.partnerSharing),
        partnerDisconnected: false,
        updatedAt: now()
      },
      updatedAt: now()
    };
    await repositories.profile.save(updated);
    await repositories.partnerConnection.createInvite();
    set({ profile: updated, toast: "Ключ подтверждения создан" });
    return code;
  },

  confirmPartnerAccessCode: async (code) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Подтверждение выполняется со стороны девушки" });
      return;
    }
    const normalized = code.trim();
    if (!profile.partnerInviteCode || normalized !== profile.partnerInviteCode) {
      set({ toast: "Ключ не совпадает" });
      return;
    }
    const timestamp = now();
    const updated = {
      ...profile,
      partnerInviteConfirmed: true,
      partnerInviteConfirmedAt: timestamp,
      partnerSharing: {
        ...normalizePartnerSharing(profile.partnerSharing),
        accessPaused: false,
        partnerDisconnected: false,
        updatedAt: timestamp
      },
      updatedAt: timestamp
    };
    await repositories.profile.save(updated);
    await repositories.partnerConnection.connectWithCode(normalized);
    set({ profile: updated, toast: "Ключ подтверждён. Партнёрский preview открыт" });
  },

  updateSharing: async (sharing) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может менять разрешения доступа" });
      return;
    }
    const updated = { ...profile, partnerSharing: normalizePartnerSharing(sharing), updatedAt: now() };
    await repositories.profile.save(updated);
    set({ profile: updated, toast: "Настройки доступа сохранены" });
  },

  setPartnerAccessPaused: async (paused) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может менять доступ" });
      return;
    }
    const timestamp = now();
    const sharing = normalizePartnerSharing(profile.partnerSharing);
    const updated = {
      ...profile,
      partnerSharing: {
        ...sharing,
        accessPaused: paused,
        partnerDisconnected: paused ? sharing.partnerDisconnected : false,
        updatedAt: timestamp
      },
      updatedAt: timestamp
    };
    await repositories.profile.save(updated);
    if (paused) await repositories.partnerConnection.pauseAccess();
    else await repositories.partnerConnection.resumeAccess();
    set({ profile: updated, toast: paused ? "Доступ партнёра приостановлен" : "Доступ партнёра возобновлён" });
  },

  disconnectPartner: async () => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может отключать доступ" });
      return;
    }
    const timestamp = now();
    const sharing = normalizePartnerSharing(profile.partnerSharing);
    const updated = {
      ...profile,
      partnerSharing: {
        ...sharing,
        accessPaused: false,
        partnerDisconnected: true,
        updatedAt: timestamp
      },
      updatedAt: timestamp
    };
    await repositories.profile.save(updated);
    await repositories.partnerConnection.disconnect();
    set({ profile: updated, toast: "Партнёрский доступ отключён" });
  },

  setSupportPreferences: async (preferences) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может менять предпочтения поддержки" });
      return;
    }
    const updated = { ...profile, supportPreferences: preferences, updatedAt: now() };
    await repositories.profile.save(updated);
    set({ profile: updated, toast: "Предпочтения поддержки сохранены" });
  },

  setHidePrivateMarkers: async (hidden) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может менять приватные маркеры" });
      return;
    }
    const updated = { ...profile, hidePrivateMarkers: hidden, updatedAt: now() };
    await repositories.profile.save(updated);
    set({ profile: updated, toast: hidden ? "Приватные маркеры скрыты" : "Приватные маркеры показаны" });
  },

  setDisableAnimatedBackground: async (disabled) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, disableAnimatedBackground: disabled, updatedAt: now() };
    await repositories.profile.save(updated);
    set({ profile: updated });
  },

  startPeriod: async (date = todayIso()) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может изменять месячные" });
      return;
    }
    const createdAt = now();
    if (get().cycles.some((cycle) => cycle.startDate === date)) {
      set({ toast: "Цикл на эту дату уже отмечен" });
      return;
    }
    const previous = [...get().cycles].filter((cycle) => cycle.startDate < date).sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1);
    if (previous) {
      const gap = differenceInCalendarDays(parseISO(date), parseISO(previous.startDate));
      if (gap > 0 && gap <= 14) {
        const confirmed =
          typeof window === "undefined" ||
          window.confirm(
            "Промежуток между началами месячных получился заметно короче предыдущих. Проверь дату. Если всё указано правильно, запись будет сохранена."
          );
        if (!confirmed) {
          set({ toast: "Создание нового цикла отменено" });
          return;
        }
      }
    }
    const cycles = deriveCycleLengths([
      ...get().cycles,
      {
        id: id("cycle"),
        startDate: date,
        source: "user",
        createdAt,
        updatedAt: createdAt
      }
    ]);
    await repositories.cycles.clear();
    await repositories.cycles.bulkPut(cycles);
    set({ cycles, toast: "Начало месячных сохранено" });
  },

  endPeriod: async (date = todayIso()) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может изменять месячные" });
      return;
    }
    const cycles = [...get().cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const latest = cycles.at(-1);
    if (!latest) {
      set({ toast: "Сначала отметь начало месячных" });
      return;
    }
    if (date < latest.startDate) {
      set({ toast: "Дата окончания не может быть раньше начала" });
      return;
    }
    const updated = {
      ...latest,
      endDate: date,
      periodLength: differenceInCalendarDays(parseISO(date), parseISO(latest.startDate)) + 1,
      updatedAt: now()
    };
    const next = cycles.map((cycle) => (cycle.id === latest.id ? updated : cycle));
    await repositories.cycles.upsert(updated);
    set({ cycles: next, toast: "Окончание месячных сохранено" });
  },

  saveDailyLog: async (input) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может создавать или изменять записи" });
      return;
    }
    const existing = await repositories.dailyLogs.getByDate(input.date);
    const timestamp = now();
    const log: DailyLog = {
      ...input,
      id: existing?.id ?? id("log"),
      symptoms: input.symptoms ?? [],
      intimacy: input.intimacy ?? { occurred: null },
      painLevel: input.painLevel ?? input.pain,
      hiddenFromPartner: input.hiddenFromPartner ?? existing?.hiddenFromPartner ?? false,
      noteVisibleToPartner: input.noteVisibleToPartner ?? existing?.noteVisibleToPartner ?? false,
      source: existing?.source ?? "user",
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    await repositories.dailyLogs.upsert(log);
    const others = get().dailyLogs.filter((item) => item.id !== log.id);
    set({
      dailyLogs: [...others, log].sort((a, b) => a.date.localeCompare(b.date)),
      toast: "Запись за день сохранена"
    });
  },

  deleteDailyLog: async (idValue) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может удалять записи" });
      return;
    }
    await repositories.dailyLogs.delete(idValue);
    set({ dailyLogs: get().dailyLogs.filter((log) => log.id !== idValue), toast: "Запись очищена" });
  },

  deleteDailyLogByDate: async (date) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может удалять записи" });
      return;
    }
    await repositories.dailyLogs.deleteByDate(date);
    set({ dailyLogs: get().dailyLogs.filter((log) => log.date !== date), toast: "Запись за день очищена" });
  },

  exportJson: () => {
    const profile = get().profile;
    if (!profile) return undefined;
    if (!canWriteAsTracker(profile)) return undefined;
    return createBackup(profile, get().cycles, get().dailyLogs);
  },

  importJson: async (json) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может импортировать данные" });
      return;
    }
    const payload = parseBackup(json);
    const profile = { ...payload.profile, partnerSharing: normalizePartnerSharing(payload.profile.partnerSharing) };
    await persistAll(profile, payload.cycles, payload.dailyLogs);
    set({
      profile,
      cycles: payload.cycles,
      dailyLogs: payload.dailyLogs,
      toast: "Резервная копия восстановлена"
    });
  },

  clearAll: async () => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может удалять данные" });
      return;
    }
    await Promise.all([
      repositories.profile.clear(),
      repositories.cycles.clear(),
      repositories.dailyLogs.clear(),
      repositories.partnerConnection.clear()
    ]);
    clearLunaPairBrowserState();
    set({
      profile: undefined,
      cycles: [],
      dailyLogs: [],
      error: undefined,
      loading: false,
      toast: "Приложение сброшено. Можно начать заново"
    });
  },

  dismissToast: () => set({ toast: undefined })
}));
