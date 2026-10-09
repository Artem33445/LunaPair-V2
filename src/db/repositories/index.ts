import { repositories as localRepos } from "./localRepositories";
import type {
  AdviceRepository,
  CycleRepository,
  DailyLogRepository,
  PartnerConnectionRepository,
  ProfileRepository
} from "../../types";

let firebaseRepoPromise: Promise<typeof import("./firebaseRepositories")> | null = null;
function loadFirebaseRepos() {
  if (!firebaseRepoPromise) {
    firebaseRepoPromise = import("./firebaseRepositories");
  }
  return firebaseRepoPromise;
}

function createLazyRepo<T extends object>(
  repoName: "FirebaseProfileRepository" | "FirebaseCycleRepository" | "FirebaseDailyLogRepository" | "FirebaseAdviceRepository" | "FirebasePartnerConnectionRepository",
  uid: string
): T {
  let instance: any = null;
  return new Proxy({} as T, {
    get(_target, prop) {
      if (prop === "subscribe") {
        return (callback: (...args: any[]) => void) => {
          let unsub: (() => void) | null = null;
          let cancelled = false;
          void loadFirebaseRepos().then((mod) => {
            if (cancelled) return;
            const RepoClass = mod[repoName];
            if (!instance) instance = new RepoClass(uid);
            unsub = instance.subscribe(callback);
          });
          return () => {
            cancelled = true;
            if (unsub) unsub();
          };
        };
      }

      return async (...args: any[]) => {
        if (!instance) {
          const mod = await loadFirebaseRepos();
          const RepoClass = mod[repoName];
          instance = new RepoClass(uid);
        }
        const method = instance[prop];
        if (typeof method === "function") {
          return method.apply(instance, args);
        }
        return method;
      };
    }
  });
}

export function getRepositories(uid?: string | null) {
  if (uid) {
    return {
      profile: createLazyRepo<ProfileRepository>("FirebaseProfileRepository", uid),
      cycles: createLazyRepo<CycleRepository>("FirebaseCycleRepository", uid),
      dailyLogs: createLazyRepo<DailyLogRepository>("FirebaseDailyLogRepository", uid),
      advice: createLazyRepo<AdviceRepository>("FirebaseAdviceRepository", uid),
      partnerConnection: createLazyRepo<PartnerConnectionRepository>("FirebasePartnerConnectionRepository", uid)
    };
  }
  return localRepos;
}

// Default export for initial state (before auth is resolved)
export const repositories = localRepos;
