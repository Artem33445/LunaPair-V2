import { readFileSync, writeFileSync } from "fs";
let ast = readFileSync("src/stores/appStore.ts", "utf-8");

const fixed = ast.replace(
  "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\\r\\n  await getRepositories(get().authUser?.uid).profile.save(profile);\\r\\n  await getRepositories(get().authUser?.uid).cycles.clear();\\r\\n  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);\\r\\n  await getRepositories(get().authUser?.uid).dailyLogs.clear();\\r\\n  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);\\r\\n}",
  "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\\r\\n  const uid = useAppStore.getState().authUser?.uid;\\r\\n  await getRepositories(uid).profile.save(profile);\\r\\n  await getRepositories(uid).cycles.clear();\\r\\n  await getRepositories(uid).cycles.bulkPut(cycles);\\r\\n  await getRepositories(uid).dailyLogs.clear();\\r\\n  await getRepositories(uid).dailyLogs.bulkPut(logs);\\r\\n}"
);

if (fixed === ast) {
  // Try \n
  const fixed2 = ast.replace(
    "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\\n  await getRepositories(get().authUser?.uid).profile.save(profile);\\n  await getRepositories(get().authUser?.uid).cycles.clear();\\n  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);\\n  await getRepositories(get().authUser?.uid).dailyLogs.clear();\\n  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);\\n}",
    "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\\n  const uid = useAppStore.getState().authUser?.uid;\\n  await getRepositories(uid).profile.save(profile);\\n  await getRepositories(uid).cycles.clear();\\n  await getRepositories(uid).cycles.bulkPut(cycles);\\n  await getRepositories(uid).dailyLogs.clear();\\n  await getRepositories(uid).dailyLogs.bulkPut(logs);\\n}"
  );
  writeFileSync("src/stores/appStore.ts", fixed2);
} else {
  writeFileSync("src/stores/appStore.ts", fixed);
}

