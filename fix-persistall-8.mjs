import { readFileSync, writeFileSync } from "fs";
let ast = readFileSync("src/stores/appStore.ts", "utf-8");

ast = ast.replace(
  `async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  await getRepositories(get().authUser?.uid).profile.save(profile);
  await getRepositories(get().authUser?.uid).cycles.clear();
  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);
  await getRepositories(get().authUser?.uid).dailyLogs.clear();
  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);
}`,
  `async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  const uid = useAppStore.getState().authUser?.uid;
  await getRepositories(uid).profile.save(profile);
  await getRepositories(uid).cycles.clear();
  await getRepositories(uid).cycles.bulkPut(cycles);
  await getRepositories(uid).dailyLogs.clear();
  await getRepositories(uid).dailyLogs.bulkPut(logs);
}`
);

// wait, the problem is \r\n!
ast = ast.replace(
  "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\\r\\n  await getRepositories(get().authUser?.uid).profile.save(profile);\\r\\n  await getRepositories(get().authUser?.uid).cycles.clear();\\r\\n  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);\\r\\n  await getRepositories(get().authUser?.uid).dailyLogs.clear();\\r\\n  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);\\r\\n}",
  "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\\r\\n  const uid = useAppStore.getState().authUser?.uid;\\r\\n  await getRepositories(uid).profile.save(profile);\\r\\n  await getRepositories(uid).cycles.clear();\\r\\n  await getRepositories(uid).cycles.bulkPut(cycles);\\r\\n  await getRepositories(uid).dailyLogs.clear();\\r\\n  await getRepositories(uid).dailyLogs.bulkPut(logs);\\r\\n}"
);

// Even better: just replace the specific string:
ast = ast.replaceAll(
  "getRepositories(get().authUser?.uid).profile.save(profile)",
  "getRepositories(useAppStore.getState().authUser?.uid).profile.save(profile)"
);
ast = ast.replaceAll(
  "getRepositories(get().authUser?.uid).cycles.clear()",
  "getRepositories(useAppStore.getState().authUser?.uid).cycles.clear()"
);
ast = ast.replaceAll(
  "getRepositories(get().authUser?.uid).cycles.bulkPut(cycles)",
  "getRepositories(useAppStore.getState().authUser?.uid).cycles.bulkPut(cycles)"
);
ast = ast.replaceAll(
  "getRepositories(get().authUser?.uid).dailyLogs.clear()",
  "getRepositories(useAppStore.getState().authUser?.uid).dailyLogs.clear()"
);
ast = ast.replaceAll(
  "getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs)",
  "getRepositories(useAppStore.getState().authUser?.uid).dailyLogs.bulkPut(logs)"
);

writeFileSync("src/stores/appStore.ts", ast);
console.log("Fixed persistAll.");
