import { readFileSync, writeFileSync } from "fs";
let ast = readFileSync("src/stores/appStore.ts", "utf-8");

const fromLines = [
  "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {",
  "  await getRepositories(get().authUser?.uid).profile.save(profile);",
  "  await getRepositories(get().authUser?.uid).cycles.clear();",
  "  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);",
  "  await getRepositories(get().authUser?.uid).dailyLogs.clear();",
  "  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);",
  "}"
].join("\\r\\n");

const toLines = [
  "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {",
  "  const uid = useAppStore.getState().authUser?.uid;",
  "  await getRepositories(uid).profile.save(profile);",
  "  await getRepositories(uid).cycles.clear();",
  "  await getRepositories(uid).cycles.bulkPut(cycles);",
  "  await getRepositories(uid).dailyLogs.clear();",
  "  await getRepositories(uid).dailyLogs.bulkPut(logs);",
  "}"
].join("\\r\\n");

if (ast.includes(fromLines)) {
  ast = ast.replace(fromLines, toLines);
} else {
  // try \n
  const fromLines2 = fromLines.replace(/\\r\\n/g, "\\n");
  const toLines2 = toLines.replace(/\\r\\n/g, "\\n");
  ast = ast.replace(fromLines2, toLines2);
}

writeFileSync("src/stores/appStore.ts", ast);
