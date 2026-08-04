import { readFileSync, writeFileSync } from "fs";
let ast = readFileSync("src/stores/appStore.ts", "utf-8");

const oldStr = \`async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  await getRepositories(get().authUser?.uid).profile.save(profile);
  await getRepositories(get().authUser?.uid).cycles.clear();
  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);
  await getRepositories(get().authUser?.uid).dailyLogs.clear();
  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);
}\`;
const newStr = \`async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {
  const uid = useAppStore.getState().authUser?.uid;
  await getRepositories(uid).profile.save(profile);
  await getRepositories(uid).cycles.clear();
  await getRepositories(uid).cycles.bulkPut(cycles);
  await getRepositories(uid).dailyLogs.clear();
  await getRepositories(uid).dailyLogs.bulkPut(logs);
}\`;

// Manually replace just those exact strings, avoiding regex issues
const lines = ast.split("\\n");
let out = [];
let inside = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {")) {
    inside = true;
    out.push(\`async function persistAll(profile: AppProfile, cycles: CycleEntry[], logs: DailyLog[]) {\`);
    out.push(\`  const uid = useAppStore.getState().authUser?.uid;\`);
    out.push(\`  await getRepositories(uid).profile.save(profile);\`);
    out.push(\`  await getRepositories(uid).cycles.clear();\`);
    out.push(\`  await getRepositories(uid).cycles.bulkPut(cycles);\`);
    out.push(\`  await getRepositories(uid).dailyLogs.clear();\`);
    out.push(\`  await getRepositories(uid).dailyLogs.bulkPut(logs);\`);
    out.push(\`}\`);
  } else if (inside && lines[i].startsWith("}")) {
    inside = false;
  } else if (!inside) {
    out.push(lines[i]);
  }
}

writeFileSync("src/stores/appStore.ts", out.join("\\n"));
