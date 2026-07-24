import type { AuthService, SyncService } from "../types";

export const localAuthService: AuthService = {
  getCurrentMode: () => "local"
};

export const noopSyncService: SyncService = {
  getStatus: () => ({
    mode: "local",
    available: false,
    message: "Локальный режим: синхронизация недоступна, данные не отправляются в интернет."
  })
};
