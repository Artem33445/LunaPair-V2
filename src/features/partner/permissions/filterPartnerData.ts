import type { DailyLog, PartnerSharingPreferences } from "../../../types";
import { normalizePartnerSharing } from "../domain/partnerPermissions";

export function filterPartnerLog(log: DailyLog, permissions: PartnerSharingPreferences): Partial<DailyLog> {
  const normalized = normalizePartnerSharing(permissions);
  if (log.hiddenFromPartner) {
    return {
      id: log.id,
      date: log.date,
      symptoms: []
    };
  }

  return {
    id: log.id,
    date: log.date,
    mood: normalized.shareMood ? log.mood : undefined,
    symptoms: normalized.shareSymptoms ? log.symptoms : [],
    note: normalized.shareDayNotes && log.noteVisibleToPartner ? log.note : undefined,
    pain: normalized.sharePainLevel ? log.pain : undefined,
    painLevel: normalized.sharePainLevel ? log.painLevel : undefined,
    flow: normalized.shareDischarge ? log.flow : undefined,
    wellbeing: normalized.shareDailyWellbeing ? log.wellbeing : undefined,
    energyLevel: normalized.shareEnergy ? log.energyLevel : undefined,
    sleepQuality: normalized.shareSleep ? log.sleepQuality : undefined,
    sleepHours: normalized.shareSleep ? log.sleepHours : undefined
  };
}

export function hasPrivateMarker(log: DailyLog, permissions: PartnerSharingPreferences) {
  return Boolean(!log.hiddenFromPartner && normalizePartnerSharing(permissions).sharePrivateMarkers && log.intimacy?.occurred);
}
