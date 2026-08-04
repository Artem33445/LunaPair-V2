import { readFileSync, writeFileSync } from "fs";
let ast = readFileSync("src/stores/appStore.ts", "utf-8");

ast = ast.replace(
  /async function persistAll\(profile: AppProfile, cycles: CycleEntry\[\], logs: DailyLog\[\]\) \{[\s\S]*?\}/m,
  \`async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  const uid = useAppStore.getState().authUser?.uid;
  await getRepositories(uid).profile.save(profile);
  await getRepositories(uid).cycles.clear();
  await getRepositories(uid).cycles.bulkPut(cycles);
  await getRepositories(uid).dailyLogs.clear();
  await getRepositories(uid).dailyLogs.bulkPut(logs);
}\`
);

writeFileSync("src/stores/appStore.ts", ast);
