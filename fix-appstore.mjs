import { readFileSync, writeFileSync } from "fs";

let content = readFileSync("src/stores/appStore.ts", "utf-8");

// 1. imports
content = content.replace(
  `import { repositories } from "../db/repositories/localRepositories";`,
  `import { getRepositories } from "../db/repositories";\nimport { migrateLocalToFirebaseIfNeeded } from "../services/migrationService";`
);

// 2. setAuthUser
const oldSetAuthUser = `setAuthUser: (user) => set({ authUser: user }),`;
const newSetAuthUser = `setAuthUser: async (user) => {
    set({ authUser: user });
    if (user) {
      set({ loading: true });
      await migrateLocalToFirebaseIfNeeded(user.uid);
      await get().hydrate();
    }
  },`;
content = content.replace(oldSetAuthUser, newSetAuthUser);

// 3. persistAll
const oldPersistAll = `async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  await repositories.profile.save(profile);
  await repositories.cycles.clear();
  await repositories.cycles.bulkPut(cycles);
  await repositories.dailyLogs.clear();
  await repositories.dailyLogs.bulkPut(logs);
}`;
const newPersistAll = `async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  const uid = useAppStore.getState().authUser?.uid;
  await getRepositories(uid).profile.save(profile);
  await getRepositories(uid).cycles.clear();
  await getRepositories(uid).cycles.bulkPut(cycles);
  await getRepositories(uid).dailyLogs.clear();
  await getRepositories(uid).dailyLogs.bulkPut(logs);
}`;
content = content.replace(oldPersistAll, newPersistAll);

// 4. replace all remaining repositories. with getRepositories(get().authUser?.uid).
content = content.replaceAll(/repositories\./g, `getRepositories(get().authUser?.uid).`);

writeFileSync("src/stores/appStore.ts", content);
console.log("Fixed appStore.ts correctly.");
