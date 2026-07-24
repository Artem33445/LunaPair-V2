import type { BackupPayload, CycleEntry, DailyLog, AppProfile } from "../types";

export function createBackup(profile: AppProfile, cycles: CycleEntry[], dailyLogs: DailyLog[]) {
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    cycles,
    dailyLogs
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadBackup(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lunapair-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
