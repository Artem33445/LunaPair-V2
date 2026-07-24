import Dexie, { type Table } from "dexie";
import type { AppProfile, CycleEntry, DailyLog } from "../types";
import { normalizePartnerSharing } from "../features/partner/domain/partnerPermissions";

interface SettingRecord {
  key: string;
  value: unknown;
}

export class LunaPairDatabase extends Dexie {
  profiles!: Table<AppProfile, string>;
  cycles!: Table<CycleEntry, string>;
  dailyLogs!: Table<DailyLog, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("lunapair-local");
    this.version(1).stores({
      profiles: "id, role",
      cycles: "id, startDate, source",
      dailyLogs: "id, &date, source",
      settings: "key"
    });
    this.version(2)
      .stores({
        profiles: "id, role",
        cycles: "id, startDate, source",
        dailyLogs: "id, &date, source",
        settings: "key"
      })
      .upgrade(async (transaction) => {
        const dailyLogs = transaction.table<DailyLog, string>("dailyLogs");
        await dailyLogs.toCollection().modify((log) => {
          log.symptoms = Array.isArray(log.symptoms) ? log.symptoms : [];
          log.moodChangedDuringDay = log.moodChangedDuringDay ?? false;
          log.painLevel = log.painLevel ?? log.pain;
          log.intimacy = log.intimacy ?? { occurred: null };
          log.hiddenFromPartner = log.hiddenFromPartner ?? false;
          log.noteVisibleToPartner = log.noteVisibleToPartner ?? false;
        });
        const profiles = transaction.table<AppProfile, string>("profiles");
        await profiles.toCollection().modify((profile) => {
          profile.hidePrivateMarkers = profile.hidePrivateMarkers ?? false;
          profile.partnerSharing = normalizePartnerSharing(profile.partnerSharing);
        });
      });
    this.version(3)
      .stores({
        profiles: "id, role",
        cycles: "id, startDate, source",
        dailyLogs: "id, &date, source",
        settings: "key"
      })
      .upgrade(async (transaction) => {
        const dailyLogs = transaction.table<DailyLog, string>("dailyLogs");
        await dailyLogs.toCollection().modify((log) => {
          log.hiddenFromPartner = log.hiddenFromPartner ?? false;
          log.noteVisibleToPartner = log.noteVisibleToPartner ?? false;
        });
        const profiles = transaction.table<AppProfile, string>("profiles");
        await profiles.toCollection().modify((profile) => {
          profile.partnerSharing = normalizePartnerSharing(profile.partnerSharing);
        });
      });
  }
}

export const db = new LunaPairDatabase();
