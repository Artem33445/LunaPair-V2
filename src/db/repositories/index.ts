import { repositories as localRepos } from "./localRepositories";
import {
  FirebaseAdviceRepository,
  FirebaseCycleRepository,
  FirebaseDailyLogRepository,
  FirebasePartnerConnectionRepository,
  FirebaseProfileRepository
} from "./firebaseRepositories";

export function getRepositories(uid?: string | null) {
  if (uid) {
    return {
      profile: new FirebaseProfileRepository(uid),
      cycles: new FirebaseCycleRepository(uid),
      dailyLogs: new FirebaseDailyLogRepository(uid),
      advice: new FirebaseAdviceRepository(uid),
      partnerConnection: new FirebasePartnerConnectionRepository(uid)
    };
  }
  return localRepos;
}

// Default export for initial state (before auth is resolved)
export const repositories = localRepos;
