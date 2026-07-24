import { describe, expect, it } from "vitest";
import type { AppProfile, CycleEntry, DailyLog, PartnerSharingPreferences } from "../../../types";
import { buildPartnerDashboardData } from "./partnerDashboard";
import { createDefaultSharing } from "./partnerPermissions";

const atDate = new Date("2026-07-17T12:00:00");

const cycle: CycleEntry = {
  id: "cycle_1",
  startDate: "2026-07-01",
  endDate: "2026-07-05",
  periodLength: 5,
  cycleLength: 28,
  source: "user",
  createdAt: "",
  updatedAt: ""
};

const log: DailyLog = {
  id: "log_1",
  date: "2026-07-17",
  mood: "happy",
  wellbeing: "good",
  energyLevel: "low",
  painLevel: 6,
  flow: "light",
  symptoms: ["секретный симптом"],
  sleepQuality: "bad",
  sleepHours: 5,
  note: "закрытая личная заметка",
  noteVisibleToPartner: false,
  intimacy: { occurred: true, note: "интимная приватная заметка" },
  source: "user",
  createdAt: "",
  updatedAt: ""
};

function profile(permissions: PartnerSharingPreferences): AppProfile {
  return {
    id: "local-profile",
    role: "tracker",
    name: "Анна",
    averageCycleLength: 28,
    averagePeriodLength: 5,
    theme: "system",
    onboardingCompleted: true,
    partnerSharing: permissions,
    supportPreferences: {
      preferredSupport: ["принести воды"],
      avoidWhenPossible: "давить вопросами",
      reassuranceText: "Я рядом.",
      updatedAt: ""
    },
    createdAt: "",
    updatedAt: ""
  };
}

function dashboard(permissions: PartnerSharingPreferences, dailyLog: DailyLog = log) {
  return buildPartnerDashboardData({
    profile: profile(permissions),
    cycles: [cycle],
    dailyLogs: [dailyLog],
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    atDate
  });
}

describe("partner dashboard permissions", () => {
  it("shows current cycle day when allowed", () => {
    const data = dashboard(createDefaultSharing());

    expect(data.currentCycleDay).toBe(17);
  });

  it("hides current cycle day when permission is off", () => {
    const permissions = { ...createDefaultSharing(), shareCurrentCycleDay: false };

    expect(dashboard(permissions).currentCycleDay).toBeUndefined();
  });

  it("shows calendar days when calendar permission is on", () => {
    const data = dashboard(createDefaultSharing());

    expect(data.calendarDays).toHaveLength(31);
  });

  it("hides calendar days when calendar permission is off", () => {
    const permissions = { ...createDefaultSharing(), shareCalendar: false };

    expect(dashboard(permissions).calendarDays).toEqual([]);
  });

  it("does not pass closed symptoms into partner data", () => {
    const data = dashboard(createDefaultSharing());

    expect(JSON.stringify(data)).not.toContain("секретный симптом");
    expect(data.today?.symptoms).toBeUndefined();
  });

  it("does not pass closed mood into partner data", () => {
    const data = dashboard(createDefaultSharing());

    expect(data.today?.mood).toBeUndefined();
  });

  it("hides note when global notes are enabled but the specific note is not opened", () => {
    const permissions = { ...createDefaultSharing(), shareDayNotes: true };

    expect(dashboard(permissions).today?.notePreview).toBeUndefined();
  });

  it("hides note when the specific note is opened but global notes are off", () => {
    const openedLog = { ...log, noteVisibleToPartner: true };

    expect(dashboard(createDefaultSharing(), openedLog).today?.notePreview).toBeUndefined();
  });

  it("shows note only when both note permissions are enabled", () => {
    const permissions = { ...createDefaultSharing(), shareDayNotes: true };
    const openedLog = { ...log, noteVisibleToPartner: true };

    expect(dashboard(permissions, openedLog).today?.notePreview).toBe("закрытая личная заметка");
  });

  it("keeps intimacy details closed by default", () => {
    const data = dashboard(createDefaultSharing());

    expect(JSON.stringify(data)).not.toContain("интимная приватная заметка");
  });

  it("shows intimacy details in full read-only access", () => {
    const permissions = { ...createDefaultSharing(), accessLevel: "full" as const, shareIntimacy: true, sharePrivateMarkers: true };
    const data = dashboard(permissions);

    expect(data.today?.hasPrivateMarker).toBe(true);
    expect(data.today?.intimacy?.note).toBe("интимная приватная заметка");
  });

  it("hides all details for a specifically hidden day", () => {
    const permissions = { ...createDefaultSharing(), shareMood: true, shareSymptoms: true, shareDayNotes: true };
    const hiddenLog = { ...log, hiddenFromPartner: true, noteVisibleToPartner: true };

    expect(dashboard(permissions, hiddenLog).today?.mood).toBeUndefined();
    expect(dashboard(permissions, hiddenLog).today?.notePreview).toBeUndefined();
  });

  it("pauses access without exposing data", () => {
    const permissions = { ...createDefaultSharing(), accessPaused: true };
    const data = dashboard(permissions);

    expect(data.connectionStatus).toBe("paused");
    expect(data.calendarDays).toEqual([]);
    expect(data.currentCycleDay).toBeUndefined();
  });

  it("uses support preferences before phase-only advice", () => {
    const data = dashboard(createDefaultSharing());

    expect(data.supportCard?.source).toBe("preferences");
    expect(data.supportCard?.body).toContain("принести воды");
  });
});
