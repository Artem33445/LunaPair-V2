import { addDays, formatISO } from "date-fns";
import type {
  PartnerConnection,
  PartnerConnectionRepository,
  PartnerDashboardData,
  PartnerDataService,
  PartnerInvite,
  PartnerPermissionsService,
  PartnerSharingPreferences,
  PartnerVisibleDay,
  ProfileRepository
} from "../../../types";
import { repositories } from "../../../db/repositories/localRepositories";
import { buildPartnerDashboardData, buildPartnerVisibleDay } from "../domain/partnerDashboard";
import { normalizePartnerSharing } from "../domain/partnerPermissions";
import { id, todayIso } from "../../../lib/utils";

const iso = (date: Date) => formatISO(date, { representation: "date" });

export class LocalPartnerDataService implements PartnerDataService {
  async getPartnerDashboard(): Promise<PartnerDashboardData> {
    const [profile, cycles, dailyLogs] = await Promise.all([
      repositories.profile.get(),
      repositories.cycles.list(),
      repositories.dailyLogs.list()
    ]);
    const startDate = iso(addDays(new Date(), -14));
    const endDate = iso(addDays(new Date(), 35));
    return buildPartnerDashboardData({ profile, cycles, dailyLogs, startDate, endDate });
  }

  async getPartnerCalendar(startDate: string, endDate: string): Promise<PartnerVisibleDay[]> {
    const [profile, cycles, dailyLogs] = await Promise.all([
      repositories.profile.get(),
      repositories.cycles.list(),
      repositories.dailyLogs.list()
    ]);
    return buildPartnerDashboardData({ profile, cycles, dailyLogs, startDate, endDate }).calendarDays;
  }

  async getPartnerDay(date: string): Promise<PartnerVisibleDay | undefined> {
    const [profile, cycles, dailyLogs] = await Promise.all([
      repositories.profile.get(),
      repositories.cycles.list(),
      repositories.dailyLogs.list()
    ]);
    const permissions = normalizePartnerSharing(profile?.partnerSharing);
    if (permissions.accessPaused || permissions.partnerDisconnected || !permissions.shareCalendar) return undefined;
    return buildPartnerVisibleDay({
      date,
      permissions,
      cycles,
      dailyLogs,
      fallbackCycleLength: profile?.averageCycleLength,
      fallbackPeriodLength: profile?.averagePeriodLength
    });
  }
}

export class LocalPartnerPermissionsService implements PartnerPermissionsService {
  constructor(private readonly profileRepository: ProfileRepository = repositories.profile) {}

  async getPermissions(): Promise<PartnerSharingPreferences> {
    const profile = await this.profileRepository.get();
    return normalizePartnerSharing(profile?.partnerSharing);
  }

  async updatePermissions(permissions: PartnerSharingPreferences): Promise<void> {
    const profile = await this.profileRepository.get();
    if (!profile || profile.role === "partner") return;
    await this.profileRepository.save({
      ...profile,
      partnerSharing: normalizePartnerSharing(permissions),
      updatedAt: new Date().toISOString()
    });
  }
}

export class LocalPartnerConnectionService implements PartnerConnectionRepository {
  async getConnection(): Promise<PartnerConnection | undefined> {
    return repositories.partnerConnection.getConnection();
  }

  async createInvite(): Promise<PartnerInvite> {
    return repositories.partnerConnection.createInvite();
  }

  async connectWithCode(code: string): Promise<PartnerConnection> {
    return repositories.partnerConnection.connectWithCode(code);
  }

  async disconnect(): Promise<void> {
    return repositories.partnerConnection.disconnect();
  }

  async pauseAccess(): Promise<void> {
    return repositories.partnerConnection.pauseAccess();
  }

  async resumeAccess(): Promise<void> {
    return repositories.partnerConnection.resumeAccess();
  }

  async getDemoEnabled(): Promise<boolean> {
    return repositories.partnerConnection.getDemoEnabled();
  }

  async setDemoEnabled(enabled: boolean): Promise<void> {
    await repositories.partnerConnection.setDemoEnabled(enabled);
  }

  async clear(): Promise<void> {
    await repositories.partnerConnection.clear();
  }
}

export function createLocalPartnerConnection(): PartnerConnection {
  const timestamp = new Date().toISOString();
  return {
    id: id("partner_connection"),
    status: "local-preview",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createLocalPartnerInvite(): PartnerInvite {
  return {
    code: `${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString(),
    expiresAt: iso(addDays(new Date(), 7))
  };
}

export const localPartnerServices = {
  data: new LocalPartnerDataService(),
  permissions: new LocalPartnerPermissionsService(),
  connection: new LocalPartnerConnectionService(),
  previewDate: todayIso
};
