import { readFileSync, writeFileSync } from "fs";

let ast = readFileSync("src/stores/appStore.ts", "utf-8");
let lines = ast.split(/\\r?\\n/);
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === "async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {") {
    lines[i+1] = "  const uid = useAppStore.getState().authUser?.uid;";
    lines[i+2] = "  await getRepositories(uid).profile.save(profile);";
    lines[i+3] = "  await getRepositories(uid).cycles.clear();";
    lines[i+4] = "  await getRepositories(uid).cycles.bulkPut(cycles);";
    lines[i+5] = "  await getRepositories(uid).dailyLogs.clear();";
    lines[i+6] = "  await getRepositories(uid).dailyLogs.bulkPut(logs);";
    break;
  }
}
writeFileSync("src/stores/appStore.ts", lines.join("\\r\\n"));
