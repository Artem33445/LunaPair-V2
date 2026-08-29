import { create } from "zustand";
import { addDays, differenceInCalendarDays, formatISO, parseISO } from "date-fns";
import type {
  AppProfile,
  CycleEntry,
  DailyLog,
  PartnerConnection,
  PartnerSharingPreferences,
  PartnerSupportPreferences,
  ThemePreference,
  UserRole
} from "../types";
import { User } from "firebase/auth";
import { createDemoData, defaultSharing } from "../features/cycle/domain/demoData";
import { getRepositories } from "../db/repositories";
import { migrateLocalToFirebaseIfNeeded } from "../services/migrationService";
import { createBackup } from "../services/exportService";
import { parseBackup } from "../services/importService";
import { id, todayIso } from "../lib/utils";
import { normalizePartnerSharing } from "../features/partner/domain/partnerPermissions";
import { onSnapshot, doc } from "firebase/firestore";
import { db, logout } from "../lib/firebase";

const iso = (date: Date) => formatISO(date, { representation: "date" });

interface OnboardingInput {
  role: UserRole;
  name: string;
  lastPeriodStart?: string;
  averageCycleLength?: number;
  averagePeriodLength?: number;
  theme: ThemePreference;
}

type DailyLogInput = Omit<DailyLog, "id" | "source" | "createdAt" | "updatedAt">;

interface AppState {
  authUser?: User | null;
  profile?: AppProfile;
  trackerProfile?: AppProfile;
  cycles: CycleEntry[];
  dailyLogs: DailyLog[];
  partnerConnection?: PartnerConnection;
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
  connectAsPartner: (code: string) => Promise<void>;
  updateSharing: (sharing: PartnerSharingPreferences) => Promise<void>;
  setPartnerAccessPaused: (paused: boolean) => Promise<void>;
  disconnectPartner: () => Promise<void>;
  setSupportPreferences: (preferences: PartnerSupportPreferences) => Promise<void>;
  setHidePrivateMarkers: (hidden: boolean) => Promise<void>;
  startPeriod: (date?: string) => Promise<void>;
  endPeriod: (date?: string) => Promise<void>;
  saveDailyLog: (log: DailyLogInput) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<void>;
  deleteDailyLogByDate: (date: string) => Promise<void>;
  exportJson: () => string | undefined;
  importJson: (json: string) => Promise<void>;
  clearAll: () => Promise<void>;
  dismissToast: () => void;
  _unsubscribers: Array<() => void>;
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
  await getRepositories(useAppStore.getState().authUser?.uid).profile.save(profile);
  await getRepositories(useAppStore.getState().authUser?.uid).cycles.clear();
  await getRepositories(useAppStore.getState().authUser?.uid).cycles.bulkPut(cycles);
  await getRepositories(useAppStore.getState().authUser?.uid).dailyLogs.clear();
  await getRepositories(useAppStore.getState().authUser?.uid).dailyLogs.bulkPut(logs);
}

function canWriteAsTracker(profile: AppProfile | undefined) {
  return profile?.role !== "partner";
}

function generateSixDigitCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  authUser: undefined,
  profile: undefined,
  trackerProfile: undefined,
  cycles: [],
  dailyLogs: [],
  partnerConnection: undefined,
  loading: true,
  _unsubscribers: [],

  setAuthUser: async (user) => {
    // Clean up old subscriptions
    get()._unsubscribers.forEach(unsub => unsub());
    set({ _unsubscribers: [] });
    
    set({ authUser: user });
    if (user) {
      set({ loading: true });
      try {
        await migrateLocalToFirebaseIfNeeded(user.uid);
        await get().hydrate();
        
        // Setup subscriptions
        const myRepos = getRepositories(user.uid);
        const myProfile = await myRepos.profile.get();
        const conn = await myRepos.partnerConnection.getConnection();
        set({ partnerConnection: conn });
        let targetUid = user.uid;
        
        if (myProfile?.role === "partner") {
          if (conn && conn.status === "active") {
            targetUid = conn.id; // Trackers UID
          }
        }
        
        // Subscribe to profile separately (always our own)
        const unsubProfile = (myRepos.profile as any).subscribe?.((profile: AppProfile) => {
          const normalized = profile ? { ...profile, partnerSharing: normalizePartnerSharing(profile.partnerSharing) } : undefined;
          set({ profile: normalized });
        });

        const unsubs: any[] = [];
        if (unsubProfile) unsubs.push(unsubProfile);

        const targetRepos = getRepositories(targetUid);

        if (targetUid !== user.uid) {
          const unsubTrackerProfile = (targetRepos.profile as any).subscribe?.((tProfile: AppProfile) => {
            const normalized = tProfile ? { ...tProfile, partnerSharing: normalizePartnerSharing(tProfile.partnerSharing) } : undefined;
            set({ trackerProfile: normalized });
          });
          if (unsubTrackerProfile) unsubs.push(unsubTrackerProfile);
        }
        
        const unsubCycles = (targetRepos.cycles as any).subscribe?.((cycles: CycleEntry[]) => {
          set({ cycles });
        });
        const unsubLogs = (targetRepos.dailyLogs as any).subscribe?.((logs: DailyLog[]) => {
          set({ dailyLogs: logs });
        });
        
        if (unsubCycles) unsubs.push(unsubCycles);
        if (unsubLogs) unsubs.push(unsubLogs);

        // Resume listening to pending invite if exists
        if (myProfile && canWriteAsTracker(myProfile) && myProfile.partnerInviteCode && !myProfile.partnerInviteConfirmed) {
          const unsubInvite = onSnapshot(doc(db, "invites", myProfile.partnerInviteCode), async (snap: any) => {
            if (snap.exists() && snap.data().partnerUid) {
              const timestamp = now();
              const currentProfile = get().profile;
              if (currentProfile) {
                const finalProfile = {
                  ...currentProfile,
                  partnerInviteConfirmed: true,
                  partnerInviteConfirmedAt: timestamp,
                  partnerUid: snap.data().partnerUid,
                  partnerSharing: {
                    ...normalizePartnerSharing(currentProfile.partnerSharing),
                    accessPaused: false,
                    partnerDisconnected: false,
                    updatedAt: timestamp
                  },
                  updatedAt: timestamp
                };
                await getRepositories(get().authUser?.uid).profile.save(finalProfile);
                set({ profile: finalProfile, toast: "Партнёр успешно подключился!" });
              }
              unsubInvite();
            }
          });
          unsubs.push(unsubInvite);
        }

        set({ _unsubscribers: unsubs });
      } catch (error: any) {
        console.error("Auth init error:", error);
        set({ loading: false, error: "Ошибка при загрузке облачных данных: " + error.message });
      }
    }
  },

  hydrate: async () => {
    set({ loading: true, error: undefined });
    try {
      const uid = get().authUser?.uid;
      const myRepos = getRepositories(uid);
      const profile = await myRepos.profile.get();
      
      let targetUid = uid;
      if (uid && profile?.role === "partner") {
        const conn = await myRepos.partnerConnection.getConnection();
        if (conn && conn.status === "active") {
          targetUid = conn.id;
        }
      }
      
      const targetRepos = getRepositories(targetUid);
      let cycles: CycleEntry[] = [];
      let dailyLogs: DailyLog[] = [];
      try {
        [cycles, dailyLogs] = await Promise.all([
          targetRepos.cycles.list(),
          targetRepos.dailyLogs.list()
        ]);
      } catch (err) {
        console.warn("Failed to load cycles from target repos:", err);
        if (profile?.role === "partner") {
          cycles = [];
          dailyLogs = [];
        } else {
          throw err;
        }
      }
      let trackerProfile: AppProfile | undefined = undefined;
      if (targetUid !== uid) {
        try {
          const rawTrackerProfile = await targetRepos.profile.get();
          trackerProfile = rawTrackerProfile ? { ...rawTrackerProfile, partnerSharing: normalizePartnerSharing(rawTrackerProfile.partnerSharing) } : undefined;
        } catch (err) {
          console.warn("Failed to load tracker profile:", err);
        }
      }
      const normalized = profile ? { ...profile, partnerSharing: normalizePartnerSharing(profile.partnerSharing) } : undefined;
      const conn = await myRepos.partnerConnection.getConnection();
      set({ profile: normalized, trackerProfile, cycles, dailyLogs, partnerConnection: conn, loading: false });
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
      averageCycleLength: input.averageCycleLength ?? 28,
      averagePeriodLength: input.averagePeriodLength ?? 5,
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
    const periodLength = input.averagePeriodLength ?? 5;
    const cycleLength = input.averageCycleLength ?? 28;
    const cycles: CycleEntry[] =
      input.role === "tracker" && input.lastPeriodStart
        ? [
            {
              id: id("cycle"),
              startDate: input.lastPeriodStart,
              endDate: iso(addDays(parseISO(input.lastPeriodStart), periodLength - 1)),
              periodLength,
              cycleLength,
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
    await getRepositories(get().authUser?.uid).partnerConnection.setDemoEnabled(true);
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
    await getRepositories(get().authUser?.uid).profile.save(updated);
    set({ profile: updated, toast: "Тема сохранена" });
  },

  setRole: async (role) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, role, updatedAt: now() };
    await getRepositories(get().authUser?.uid).profile.save(updated);
    set({ profile: updated, toast: "Роль изменена" });
  },

  generatePartnerAccessCode: async () => {
    try {
      const profile = get().profile;
      if (!profile) return undefined;
      if (!canWriteAsTracker(profile)) {
        set({ toast: "Вернись в режим девушки, чтобы создать ключ" });
        return undefined;
      }
      
      // Delegate code generation to the repository which handles Firestore logic
      const invite = await getRepositories(get().authUser?.uid).partnerConnection.createInvite();
      const code = invite.code;
      
      const updated: Partial<AppProfile> = {
        ...profile,
        partnerInviteCode: code,
        partnerInviteConfirmed: false,
        partnerSharing: {
          ...normalizePartnerSharing(profile.partnerSharing),
          partnerDisconnected: false,
          updatedAt: now()
        },
        updatedAt: now()
      };
      
      // Remove fields that shouldn't be defined yet
      delete updated.partnerInviteConfirmedAt;
      delete updated.partnerUid;

      await getRepositories(get().authUser?.uid).profile.save(updated as AppProfile);
      
      // Listen for partner connection
      const unsub = onSnapshot(doc(db, "invites", code), async (snap: any) => {
        if (snap.exists() && snap.data().partnerUid) {
          // Partner has connected!
          const timestamp = now();
          const currentProfile = get().profile;
          if (currentProfile) {
            const finalProfile = {
              ...currentProfile,
              partnerInviteConfirmed: true,
              partnerInviteConfirmedAt: timestamp,
              partnerUid: snap.data().partnerUid,
              partnerSharing: {
                ...normalizePartnerSharing(currentProfile.partnerSharing),
                accessPaused: false,
                partnerDisconnected: false,
                updatedAt: timestamp
              },
              updatedAt: timestamp
            };
            await getRepositories(get().authUser?.uid).profile.save(finalProfile);
            set({ profile: finalProfile, toast: "Партнёр успешно подключился!" });
          }
          unsub(); // Stop listening
        }
      });
      
      set({ profile: updated as AppProfile, toast: "Ключ создан. Ожидание партнёра..." });
      return code;
    } catch (e: any) {
      console.error(e);
      set({ toast: "Ошибка при создании ключа: " + e.message });
      return undefined;
    }
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
    await getRepositories(get().authUser?.uid).profile.save(updated);
    set({ profile: updated, toast: "Ключ подтверждён. Партнёрский preview открыт" });
  },

  connectAsPartner: async (code) => {
    try {
      const normalized = code.trim().toUpperCase();
      const conn = await getRepositories(get().authUser?.uid).partnerConnection.connectWithCode(normalized);
      set({ partnerConnection: conn });
      // Re-hydrate to pull the tracker's data using the new connection
      await get().hydrate();
      if (get().authUser) {
        await get().setAuthUser(get().authUser ?? null);
      }
      set({ toast: "Успешно подключено к трекеру!" });
    } catch (e: any) {
      set({ toast: e.message || "Не удалось подключиться. Проверьте код." });
    }
  },

  updateSharing: async (sharing) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может менять разрешения доступа" });
      return;
    }
    const updated = { ...profile, partnerSharing: normalizePartnerSharing(sharing), updatedAt: now() };
    await getRepositories(get().authUser?.uid).profile.save(updated);
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
    await getRepositories(get().authUser?.uid).profile.save(updated);
    if (paused) await getRepositories(get().authUser?.uid).partnerConnection.pauseAccess();
    else await getRepositories(get().authUser?.uid).partnerConnection.resumeAccess();
    set({ profile: updated, toast: paused ? "Доступ партнёра приостановлен" : "Доступ партнёра возобновлён" });
  },

  disconnectPartner: async () => {
    const profile = get().profile;
    if (!profile) return;
    const uid = get().authUser?.uid;
    if (profile.role === "partner") {
      await getRepositories(uid).partnerConnection.disconnect();
      set({
        partnerConnection: undefined,
        cycles: [],
        dailyLogs: [],
        toast: "Подключение отключено"
      });
      return;
    }
    const timestamp = now();
    const sharing = normalizePartnerSharing(profile.partnerSharing);
    const updated = {
      ...profile,
      partnerInviteConfirmed: false,
      partnerInviteCode: undefined,
      partnerInviteConfirmedAt: undefined,
      partnerUid: undefined,
      partnerSharing: {
        ...sharing,
        accessPaused: false,
        partnerDisconnected: true,
        updatedAt: timestamp
      },
      updatedAt: timestamp
    };
    await getRepositories(uid).profile.save(updated as any);
    await getRepositories(uid).partnerConnection.disconnect();
    set({ profile: updated as any, toast: "Партнёрский доступ отключён" });
  },

  setSupportPreferences: async (preferences) => {
    const profile = get().profile;
    if (!profile) return;
    if (!canWriteAsTracker(profile)) {
      set({ toast: "Партнёр не может менять предпочтения поддержки" });
      return;
    }
    const updated = { ...profile, supportPreferences: preferences, updatedAt: now() };
    await getRepositories(get().authUser?.uid).profile.save(updated);
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
    await getRepositories(get().authUser?.uid).profile.save(updated);
    set({ profile: updated, toast: hidden ? "Приватные маркеры скрыты" : "Приватные маркеры показаны" });
  },

  startPeriod: async (date = todayIso()) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может изменять месячные" });
      return;
    }
    try {
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
      await getRepositories(useAppStore.getState().authUser?.uid).cycles.clear();
      await getRepositories(useAppStore.getState().authUser?.uid).cycles.bulkPut(cycles);
      set({ cycles, toast: "Начало месячных сохранено" });
    } catch (e: any) {
      console.error("Error starting period:", e);
      set({ toast: "Ошибка при сохранении: " + (e?.message || "не удалось сохранить") });
    }
  },

  endPeriod: async (date = todayIso()) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может изменять месячные" });
      return;
    }
    try {
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
      await getRepositories(get().authUser?.uid).cycles.upsert(updated);
      set({ cycles: next, toast: "Окончание месячных сохранено" });
    } catch (e: any) {
      console.error("Error ending period:", e);
      set({ toast: "Ошибка при сохранении: " + (e?.message || "не удалось сохранить") });
    }
  },

  saveDailyLog: async (input) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может создавать или изменять записи" });
      return;
    }
    try {
      const existing = await getRepositories(get().authUser?.uid).dailyLogs.getByDate(input.date);
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
      await getRepositories(get().authUser?.uid).dailyLogs.upsert(log);
      const others = get().dailyLogs.filter((item) => item.id !== log.id);
      set({
        dailyLogs: [...others, log].sort((a, b) => a.date.localeCompare(b.date)),
        toast: "Запись за день сохранена"
      });
    } catch (e: any) {
      console.error("Error saving daily log:", e);
      set({ toast: "Ошибка при сохранении: " + (e?.message || "не удалось сохранить") });
    }
  },

  deleteDailyLog: async (idValue) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может удалять записи" });
      return;
    }
    try {
      await getRepositories(get().authUser?.uid).dailyLogs.delete(idValue);
      set({ dailyLogs: get().dailyLogs.filter((log) => log.id !== idValue), toast: "Запись очищена" });
    } catch (e: any) {
      console.error("Error deleting daily log:", e);
      set({ toast: "Ошибка при удалении: " + (e?.message || "не удалось удалить") });
    }
  },

  deleteDailyLogByDate: async (date) => {
    if (!canWriteAsTracker(get().profile)) {
      set({ toast: "Партнёр не может удалять записи" });
      return;
    }
    try {
      await getRepositories(get().authUser?.uid).dailyLogs.deleteByDate(date);
      set({ dailyLogs: get().dailyLogs.filter((log) => log.date !== date), toast: "Запись за день очищена" });
    } catch (e: any) {
      console.error("Error deleting daily log by date:", e);
      set({ toast: "Ошибка при удалении: " + (e?.message || "не удалось удалить") });
    }
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
    const uid = get().authUser?.uid;
    if (uid) {
      const repos = getRepositories(uid);
      await Promise.all([
        repos.profile.clear().catch(() => {}),
        repos.cycles.clear().catch(() => {}),
        repos.dailyLogs.clear().catch(() => {}),
        repos.advice.clear().catch(() => {}),
        repos.partnerConnection.clear().catch(() => {})
      ]);
    }
    await logout().catch(() => {});
    clearLunaPairBrowserState();
    set({
      profile: undefined,
      trackerProfile: undefined,
      cycles: [],
      dailyLogs: [],
      partnerConnection: undefined,
      error: undefined,
      loading: false,
      toast: "Приложение сброшено. Можно начать заново"
    });
    window.location.href = "/";
  },

  dismissToast: () => set({ toast: undefined })
}));
