import type {
  AppProfile,
  CycleEntry,
  CycleRepository,
  DailyLog,
  DailyLogRepository,
  PartnerConnection,
  PartnerConnectionRepository,
  PartnerInvite,
  ProfileRepository
} from "../../types";
import { id } from "../../lib/utils";
import { db } from "../database";

export class LocalCycleRepository implements CycleRepository {
  async list() {
    return db.cycles.orderBy("startDate").toArray();
  }

  async upsert(cycle: CycleEntry) {
    await db.cycles.put(cycle);
  }

  async delete(id: string) {
    await db.cycles.delete(id);
  }

  async clear() {
    await db.cycles.clear();
  }

  async bulkPut(cycles: CycleEntry[]) {
    await db.cycles.bulkPut(cycles);
  }

  async getCurrent() {
    return db.cycles.orderBy("startDate").last();
  }

  async getCompleted() {
    const cycles = await this.list();
    return cycles.filter((cycle) => Boolean(cycle.endDate));
  }

  async getById(id: string) {
    return db.cycles.get(id);
  }

  async update(cycle: CycleEntry) {
    await db.cycles.put(cycle);
    return cycle;
  }
}

export class LocalDailyLogRepository implements DailyLogRepository {
  async list() {
    return db.dailyLogs.orderBy("date").toArray();
  }

  async getByDate(date: string) {
    return db.dailyLogs.where("date").equals(date).first();
  }

  async upsert(log: DailyLog) {
    await db.dailyLogs.put(log);
    return log;
  }

  async getByDateRange(start: string, end: string) {
    return db.dailyLogs.where("date").between(start, end, true, true).sortBy("date");
  }

  async delete(id: string) {
    await db.dailyLogs.delete(id);
  }

  async deleteByDate(date: string) {
    await db.dailyLogs.where("date").equals(date).delete();
  }

  async clear() {
    await db.dailyLogs.clear();
  }

  async bulkPut(logs: DailyLog[]) {
    await db.dailyLogs.bulkPut(logs);
  }
}

export class LocalProfileRepository implements ProfileRepository {
  async get() {
    return db.profiles.get("local-profile");
  }

  async save(profile: AppProfile) {
    await db.profiles.put(profile);
  }

  async clear() {
    await db.profiles.clear();
  }
}

export class LocalPartnerConnectionRepository implements PartnerConnectionRepository {
  async getConnection() {
    const record = await db.settings.get("partner-connection");
    return isPartnerConnection(record?.value) ? record.value : undefined;
  }

  async createInvite() {
    const invite: PartnerInvite = {
      code: `${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };
    await db.settings.put({ key: "partner-invite", value: invite });
    return invite;
  }

  async connectWithCode(code: string) {
    const timestamp = new Date().toISOString();
    const connection: PartnerConnection = {
      id: id("partner_connection"),
      status: "local-preview",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await db.settings.put({ key: "partner-connection", value: connection });
    await db.settings.put({ key: "partner-last-code", value: code });
    return connection;
  }

  async disconnect() {
    const existing = await this.getConnection();
    const timestamp = new Date().toISOString();
    await db.settings.put({
      key: "partner-connection",
      value: {
        id: existing?.id ?? id("partner_connection"),
        status: "disconnected",
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      } satisfies PartnerConnection
    });
  }

  async pauseAccess() {
    const existing = await this.getConnection();
    const timestamp = new Date().toISOString();
    await db.settings.put({
      key: "partner-connection",
      value: {
        id: existing?.id ?? id("partner_connection"),
        status: "paused",
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      } satisfies PartnerConnection
    });
  }

  async resumeAccess() {
    const existing = await this.getConnection();
    const timestamp = new Date().toISOString();
    await db.settings.put({
      key: "partner-connection",
      value: {
        id: existing?.id ?? id("partner_connection"),
        status: "local-preview",
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      } satisfies PartnerConnection
    });
  }

  async getDemoEnabled() {
    const record = await db.settings.get("partner-demo-enabled");
    return typeof record?.value === "boolean" ? record.value : false;
  }

  async setDemoEnabled(enabled: boolean) {
    await db.settings.put({ key: "partner-demo-enabled", value: enabled });
  }

  async clear() {
    await db.settings.clear();
  }
}

function isPartnerConnection(value: unknown): value is PartnerConnection {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    (record.status === "local-preview" || record.status === "paused" || record.status === "disconnected") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

export const repositories = {
  cycles: new LocalCycleRepository(),
  dailyLogs: new LocalDailyLogRepository(),
  profile: new LocalProfileRepository(),
  partnerConnection: new LocalPartnerConnectionRepository()
};
